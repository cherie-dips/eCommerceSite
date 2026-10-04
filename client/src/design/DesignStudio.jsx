// The design studio: add photos, logos, text and shapes to a product, get layout
// suggestions, preview it (in 3D for mugs) and save it / add it to the cart.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api, { assetUrl, errorMessage } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import DesignCanvas from "./DesignCanvas";
import LayerPanel from "./LayerPanel";
import PropertiesPanel from "./PropertiesPanel";
import SuggestionsPanel from "./SuggestionsPanel";
import { useHistory } from "./useHistory";
import {
  DESIGN_WIDTH,
  createImageLayer,
  createShapeLayer,
  createTextLayer,
  designHeight,
  getProductViews,
  newId,
  printHeightCm,
  printPixelWidth,
} from "./designUtils";
import { analyzeImage, dataUrlToBlob, imageToDataUrl, loadImage, readImageFile, sampleColor } from "./imageTools";
import { templateSuggestions, materializeSuggestion } from "./suggestions";
import { renderPreview, renderPrintFile } from "./renderer";
import { loadFont, loadFontsFor } from "./fonts";
import { clearDraft, loadDraft, saveDraft } from "./draftStore";
import "../styles/DesignStudio.css";

const Mug3DPreview = lazy(() => import("./Mug3DPreview"));

const NO_LAYERS = []; // same empty list every time, so nothing redraws needlessly
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
const isTyping = (target) => ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName) || target?.isContentEditable;

// Loads a product photo so it can be drawn on the canvas and used in exported pictures.
async function loadMockup(url) {
  try {
    return { img: await loadImage(url, "anonymous"), readable: true };
  } catch {
    // Photos from other websites may refuse; show them anyway (previews then use a plain background)
    return { img: await loadImage(url), readable: false };
  }
}

export default function DesignStudio({ product, initialDesign, onAddToCart, onSaved }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const views = useMemo(() => getProductViews(product), [product]);
  const [activeKey, setActiveKey] = useState(views[0]?.key || "front");
  const activeView = views.find((v) => v.key === activeKey) || views[0];

  const [mockups, setMockups] = useState({}); // view key -> { img, readable, H }
  const history = useHistory({});
  const design = history.value;
  const layers = design[activeKey] || NO_LAYERS;
  const mockup = mockups[activeKey];
  const H = mockup?.H || designHeight(activeView.area);

  const [images, setImages] = useState(() => new Map()); // imageKey -> <img>
  const assets = useRef(new Map()); // assetId -> File (uploaded, not saved yet)
  const [uploads, setUploads] = useState([]); // [{ assetId, url, width, height, analysis }]
  const [suggestionFor, setSuggestionFor] = useState(null); // assetId of the upload the suggestions are for
  const [brandText, setBrandText] = useState("");
  const [aiState, setAiState] = useState({ enabled: false, loading: false, error: "", suggestions: [] });

  const [selectedId, setSelectedId] = useState(null);
  const [showGuides, setShowGuides] = useState(true);
  const [fontsVersion, setFontsVersion] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState("");
  const [show3D, setShow3D] = useState(false);
  const [texture3D, setTexture3D] = useState(null);
  const [tab, setTab] = useState("add");

  const canvasBoxRef = useRef(null);
  const [canvasWidth, setCanvasWidth] = useState(560);
  const fileInputRef = useRef(null);

  // ---- Product photos for each side ----
  useEffect(() => {
    let cancelled = false;
    views.forEach(async (view) => {
      try {
        const { img, readable } = await loadMockup(view.image);
        if (cancelled) return;
        setMockups((m) => ({ ...m, [view.key]: { img, readable, H: designHeight(view.area, img.naturalWidth, img.naturalHeight) } }));
      } catch {
        if (!cancelled) setMockups((m) => ({ ...m, [view.key]: { img: null, readable: false, H: designHeight(view.area) } }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [views]);

  // ---- Canvas size follows the space available ----
  useEffect(() => {
    const box = canvasBoxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      setCanvasWidth(Math.max(260, Math.min(640, Math.floor(entry.contentRect.width))));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // ---- Redraw text once web fonts have loaded ----
  useEffect(() => {
    document.fonts?.ready.then(() => setFontsVersion((v) => v + 1));
  }, []);

  // ---- Is the optional AI designer turned on? ----
  useEffect(() => {
    api
      .get("/design-suggestions/status")
      .then((res) => setAiState((s) => ({ ...s, enabled: Boolean(res.data.ai) })))
      .catch(() => {});
  }, []);

  // ---- Open a saved design ----
  useEffect(() => {
    if (!initialDesign) return;
    const restored = {};
    for (const view of initialDesign.views || []) {
      if (view.view === "3d") continue;
      restored[view.view] = (view.layers || []).map((l) => ({ ...l, id: l.id || newId() }));
    }
    history.reset(restored);
    const sources = new Set(
      Object.values(restored).flat().filter((l) => l.type === "image" && l.src).map((l) => l.src)
    );
    sources.forEach(async (src) => {
      try {
        const img = await loadImage(assetUrl(src), "anonymous");
        setImages((m) => new Map(m).set(`src:${src}`, img));
      } catch {
        toast.error("One of the images in this design could not be loaded.");
      }
    });
    loadFontsFor(Object.values(restored).flat()).then(() => setFontsVersion((v) => v + 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDesign]);

  // ---- Unsaved work is kept in this browser (survives refresh / logging in) ----
  const [draftReady, setDraftReady] = useState(Boolean(initialDesign));
  useEffect(() => {
    if (initialDesign) return;
    let cancelled = false;
    loadDraft(product._id).then(async (draft) => {
      if (cancelled) return;
      if (draft?.design && Object.values(draft.design).some((l) => l.length)) {
        const restoredUploads = [];
        const restoredImages = new Map();
        for (const u of draft.uploads || []) {
          try {
            const url = URL.createObjectURL(u.file);
            restoredImages.set(`asset:${u.assetId}`, await loadImage(url));
            assets.current.set(u.assetId, u.file);
            restoredUploads.push({ ...u, url });
          } catch {
            // skip a broken image
          }
        }
        setImages((m) => new Map([...m, ...restoredImages]));
        setUploads(restoredUploads);
        setSuggestionFor(restoredUploads[0]?.assetId || null);
        setBrandText(draft.brandText || "");
        history.reset(draft.design);
        loadFontsFor(Object.values(draft.design).flat()).then(() => setFontsVersion((v) => v + 1));
        toast.info("We kept your unfinished design.");
      }
      setDraftReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product._id, initialDesign]);

  useEffect(() => {
    if (!draftReady || initialDesign) return;
    const timer = setTimeout(() => {
      const used = new Set(Object.values(design).flat().map((l) => l.assetId).filter(Boolean));
      saveDraft({
        productId: product._id,
        design,
        brandText,
        uploads: uploads
          .filter((u) => used.has(u.assetId) || u.assetId === suggestionFor)
          .map(({ assetId, name, width, height, analysis }) => ({ assetId, name, width, height, analysis, file: assets.current.get(assetId) })),
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [design, uploads, brandText, suggestionFor, draftReady, initialDesign, product._id]);

  // ---- Changing the design ----
  const setLayers = useCallback(
    (updater, options) => {
      history.set((d) => ({ ...d, [activeKey]: updater(d[activeKey] || []) }), options);
    },
    [history, activeKey]
  );

  const updateLayer = useCallback(
    (id, changes, coalesce) => {
      setLayers((list) => list.map((l) => (l.id === id ? { ...l, ...changes } : l)), coalesce ? { coalesce: `${id}:${coalesce}` } : undefined);
      if (changes.fontFamily || changes.fontStyle) {
        const layer = layers.find((l) => l.id === id);
        loadFont(changes.fontFamily || layer?.fontFamily, changes.fontStyle || layer?.fontStyle).then(() => setFontsVersion((v) => v + 1));
      }
    },
    [setLayers, layers]
  );

  const addLayer = useCallback(
    (layer) => {
      setLayers((list) => [...list, layer]);
      setSelectedId(layer.id);
    },
    [setLayers]
  );

  const removeLayer = useCallback(
    (id) => {
      setLayers((list) => list.filter((l) => l.id !== id));
      setSelectedId((s) => (s === id ? null : s));
    },
    [setLayers]
  );

  const duplicateLayer = useCallback(
    (id) => {
      const layer = layers.find((l) => l.id === id);
      if (!layer) return;
      const copy = { ...layer, id: newId(), x: Math.min(DESIGN_WIDTH, layer.x + 40), y: Math.min(H, layer.y + 40), locked: false };
      addLayer(copy);
    },
    [layers, addLayer, H]
  );

  // dir: +1 = towards the front, -1 = towards the back
  const moveLayer = (id, dir) =>
    setLayers((list) => {
      const i = list.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const toggleLayer = (id, key) => setLayers((list) => list.map((l) => (l.id === id ? { ...l, [key]: !l[key] } : l)));

  // ---- Uploading photos/logos ----
  const handleFiles = async (fileList) => {
    const files = [...(fileList || [])].slice(0, 6);
    for (const file of files) {
      try {
        const { file: finalFile, url, img, width, height } = await readImageFile(file);
        const assetId = newId();
        assets.current.set(assetId, finalFile);
        setImages((m) => new Map(m).set(`asset:${assetId}`, img));
        const analysis = analyzeImage(img);
        const upload = { assetId, url, width, height, analysis, name: file.name };
        setUploads((u) => [upload, ...u].slice(0, 12));
        addLayer(createImageLayer({ assetId, naturalWidth: width, naturalHeight: height, H, name: file.name.replace(/\.\w+$/, "").slice(0, 24) || "Image" }));
        setSuggestionFor(assetId);
        setAiState((s) => ({ ...s, suggestions: [], error: "" }));
        setTab("ideas");
      } catch (err) {
        toast.error(err.message || "That image could not be used.");
      }
    }
  };

  const addUploadAgain = (upload) =>
    addLayer(createImageLayer({ assetId: upload.assetId, naturalWidth: upload.width, naturalHeight: upload.height, H, name: upload.name?.replace(/\.\w+$/, "").slice(0, 24) }));

  const addText = () => {
    // Put new text under whatever is already there (or in the middle of an empty design)
    const bottom = layers.reduce((max, l) => Math.max(max, l.y + (l.height || 0) / 2), 0);
    const y = layers.length ? Math.min(H - 80, Math.max(H * 0.75, bottom + 90)) : H / 2;
    const layer = createTextLayer(H, { text: brandText.trim() || "Your text", y, fontSize: Math.round(Math.min(120, H * 0.1)) });
    loadFont(layer.fontFamily, layer.fontStyle).then(() => setFontsVersion((v) => v + 1));
    addLayer(layer);
    setTab("edit");
  };

  // ---- Suggestions ----
  const suggestionUpload = uploads.find((u) => u.assetId === suggestionFor) || null;
  const productColor = useMemo(
    () => (mockup?.img && mockup.readable ? sampleColor(mockup.img, activeView.area) : "#ffffff"),
    [mockup, activeView.area]
  );
  const templates = useMemo(
    () =>
      suggestionUpload
        ? templateSuggestions({ analysis: suggestionUpload.analysis, H, brandText, productColor, category: product.category })
        : [],
    [suggestionUpload, H, brandText, productColor, product.category]
  );

  const applySuggestion = (suggestion) => {
    const image = { assetId: suggestionUpload.assetId, naturalWidth: suggestionUpload.width, naturalHeight: suggestionUpload.height };
    const newLayers = materializeSuggestion(suggestion, image);
    history.set((d) => ({ ...d, [activeKey]: newLayers }));
    setSelectedId(null);
    loadFontsFor(newLayers).then(() => setFontsVersion((v) => v + 1));
    toast.success(`"${suggestion.name}" applied. You can still change everything.`);
  };

  const askAi = async () => {
    if (!user) {
      toast.info("Please log in to use AI suggestions.");
      return;
    }
    if (!suggestionUpload) return;
    setAiState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const img = images.get(`asset:${suggestionUpload.assetId}`);
      const res = await api.post(
        "/design-suggestions/ai",
        {
          image: imageToDataUrl(img, 640, suggestionUpload.analysis.hasTransparency || suggestionUpload.analysis.isLogo),
          imageInfo: {
            width: suggestionUpload.width,
            height: suggestionUpload.height,
            hasTransparency: suggestionUpload.analysis.hasTransparency,
            colors: suggestionUpload.analysis.colors,
            colorCount: suggestionUpload.analysis.colorCount,
          },
          product: { name: product.name, category: product.category },
          printArea: { height: H, widthCm: activeView.area.widthCm },
          brandText: brandText.trim() || undefined,
          productColor,
        },
        { timeout: 120000 }
      );
      setAiState((s) => ({ ...s, loading: false, suggestions: res.data.suggestions }));
    } catch (err) {
      setAiState((s) => ({ ...s, loading: false, error: errorMessage(err, "AI suggestions failed. Please try again.") }));
    }
  };

  // ---- 3D preview (mugs) ----
  const frontLayers = design.front || NO_LAYERS;
  const frontMockup = mockups.front;
  useEffect(() => {
    if (!show3D) return;
    const frontView = views.find((v) => v.key === "front");
    const frontH = frontMockup?.H || designHeight(frontView.area);
    const timer = setTimeout(async () => {
      await loadFontsFor(frontLayers);
      try {
        setTexture3D(renderPrintFile({ layers: frontLayers, images, H: frontH, pixelWidth: 1024 }));
      } catch {
        setTexture3D(null);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [show3D, frontLayers, images, frontMockup, views, fontsVersion]);

  // ---- Saving ----
  const saveDesign = async ({ addToCart }) => {
    const sides = views.filter((v) => (design[v.key] || []).some((l) => !l.hidden));
    if (!sides.length) {
      toast.error("Add a photo, logo or text to your design first.");
      return;
    }
    if (!user) {
      toast.info("Please log in to save your design. We'll keep it here for you.");
      await saveDraft({
        productId: product._id,
        design,
        brandText,
        uploads: uploads.map(({ assetId, name, width, height, analysis }) => ({ assetId, name, width, height, analysis, file: assets.current.get(assetId) })),
      });
      navigate("/login", { state: { from: location.pathname + location.search } });
      return;
    }

    setSaving(addToCart ? "Adding to cart..." : "Saving design...");
    setSelectedId(null);
    try {
      await nextFrame();
      const usedAssets = [];
      const viewsData = [];
      const form = new FormData();

      for (const view of sides) {
        const viewLayers = design[view.key].filter((l) => !l.hidden);
        await loadFontsFor(viewLayers);
        const viewH = mockups[view.key]?.H || designHeight(view.area);
        const preview = renderPreview({
          mockup: mockups[view.key]?.readable ? mockups[view.key].img : null,
          area: view.area,
          layers: viewLayers,
          images,
          H: viewH,
          width: 1000,
        });
        const print = renderPrintFile({ layers: viewLayers, images, H: viewH, pixelWidth: printPixelWidth(view.area) });
        form.append("previews", await dataUrlToBlob(preview), `${view.key}-preview.jpg`);
        form.append("prints", await dataUrlToBlob(print), `${view.key}-print.png`);

        viewsData.push({
          view: view.key,
          layers: viewLayers.map((l) => {
            if (l.type !== "image") return l;
            if (l.assetId) {
              let index = usedAssets.indexOf(l.assetId);
              if (index === -1) {
                usedAssets.push(l.assetId);
                index = usedAssets.length - 1;
              }
              const saved = { ...l, src: `asset:${index}` };
              delete saved.assetId;
              return saved;
            }
            return l;
          }),
        });
      }
      usedAssets.forEach((assetId) => {
        const file = assets.current.get(assetId);
        form.append("assets", file, file.name || "image.png");
      });
      form.append("data", JSON.stringify({ productId: product._id, mode: "2d", name: `${product.name} design`, views: viewsData }));

      const res = await api.post("/designs", form, { timeout: 180000 });
      clearDraft(product._id);
      if (addToCart) {
        onAddToCart?.(res.data, quantity);
      } else {
        onSaved?.(res.data);
        toast.success("Design saved. Find it under My Designs.");
      }
    } catch (err) {
      console.error(err);
      toast.error(errorMessage(err, "Your design could not be saved. Please try again."));
    } finally {
      setSaving("");
    }
  };

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e) => {
      if (isTyping(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        history.redo();
        return;
      }
      if (!selectedId) return;
      const layer = layers.find((l) => l.id === selectedId);
      if (!layer) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeLayer(selectedId);
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateLayer(selectedId);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      } else if (e.key.startsWith("Arrow") && !layer.locked) {
        e.preventDefault();
        const step = e.shiftKey ? 25 : 5;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        updateLayer(selectedId, { x: layer.x + dx, y: layer.y + dy }, "nudge");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history, selectedId, layers, removeLayer, duplicateLayer, updateLayer]);

  const selectedLayer = layers.find((l) => l.id === selectedId) || null;
  const palette = suggestionUpload?.analysis.colors || uploads[0]?.analysis.colors || [];
  const totalLayers = views.reduce((n, v) => n + (design[v.key] || []).length, 0);

  // Selecting something switches the side panel to its settings
  const select = (id) => {
    setSelectedId(id);
    if (id) setTab("edit");
  };

  return (
    <div className="studio">
      {/* ---------- Left: add things / ideas / layers ---------- */}
      <aside className="studio-panel studio-left">
        <div className="tabs studio-tabs">
          <button className={`tab ${tab === "add" ? "active" : ""}`} onClick={() => setTab("add")}>Add</button>
          <button className={`tab ${tab === "ideas" ? "active" : ""}`} onClick={() => setTab("ideas")}>Ideas</button>
          <button className={`tab ${tab === "edit" ? "active" : ""}`} onClick={() => setTab("edit")}>Edit</button>
          <button className={`tab ${tab === "layers" ? "active" : ""}`} onClick={() => setTab("layers")}>Layers</button>
        </div>

        {tab === "add" && (
          <div className="stack">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              hidden
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              className="upload-drop"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
            >
              <strong>Upload photo or logo</strong>
              <span className="muted small">PNG, JPG or WebP. Logos with a transparent background look best.</span>
            </button>
            <div className="row">
              <button className="btn btn-secondary" onClick={addText}>＋ Text</button>
              <button className="btn btn-secondary" onClick={() => { addLayer(createShapeLayer("rect", H, { fill: palette[0] || "#7c0034" })); setTab("edit"); }}>▭ Rectangle</button>
              <button className="btn btn-secondary" onClick={() => { addLayer(createShapeLayer("ellipse", H, { fill: palette[0] || "#7c0034" })); setTab("edit"); }}>◯ Circle</button>
            </div>
            {uploads.length > 0 && (
              <div>
                <span className="field-label">Your uploads (click to add again)</span>
                <div className="upload-strip">
                  {uploads.map((u) => (
                    <button key={u.assetId} className="upload-thumb" onClick={() => addUploadAgain(u)} title="Add to design">
                      <img src={u.url} alt="" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "ideas" && (
          <SuggestionsPanel
            upload={suggestionUpload}
            templates={templates}
            ai={aiState.suggestions}
            aiEnabled={aiState.enabled}
            aiLoading={aiState.loading}
            aiError={aiState.error}
            onAskAi={askAi}
            brandText={brandText}
            onBrandTextChange={setBrandText}
            onApply={applySuggestion}
            mockup={mockup?.readable ? mockup.img : null}
            area={activeView.area}
            H={H}
            images={images}
          />
        )}

        {tab === "edit" && (
          <PropertiesPanel
            layer={selectedLayer}
            H={H}
            area={activeView.area}
            palette={palette}
            onChange={updateLayer}
            onDuplicate={duplicateLayer}
            onRemove={removeLayer}
          />
        )}

        {tab === "layers" && (
          <LayerPanel
            layers={layers}
            selectedId={selectedId}
            area={activeView.area}
            onSelect={select}
            onMove={moveLayer}
            onToggle={toggleLayer}
            onRemove={removeLayer}
          />
        )}
      </aside>

      {/* ---------- Middle: the product ---------- */}
      <section className="studio-main">
        <div className="studio-toolbar">
          {views.length > 1 && (
            <div className="segmented">
              {views.map((v) => (
                <button
                  key={v.key}
                  className={v.key === activeKey ? "active" : ""}
                  onClick={() => {
                    setActiveKey(v.key);
                    setSelectedId(null);
                    setShow3D(false);
                  }}
                >
                  {v.label}
                  {(design[v.key] || []).length > 0 && <span className="dot" />}
                </button>
              ))}
            </div>
          )}
          <div className="row">
            <button className="btn btn-ghost btn-sm" onClick={history.undo} disabled={!history.canUndo} title="Undo (Ctrl/Cmd+Z)">↶ Undo</button>
            <button className="btn btn-ghost btn-sm" onClick={history.redo} disabled={!history.canRedo} title="Redo (Ctrl/Cmd+Shift+Z)">↷ Redo</button>
            <label className="checkbox small">
              <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} /> Print area
            </label>
            {product.model3d === "mug" && (
              <button className={`btn btn-sm ${show3D ? "btn-primary" : "btn-secondary"}`} onClick={() => { setActiveKey("front"); setShow3D((s) => !s); }}>
                {show3D ? "Back to editing" : "3D preview"}
              </button>
            )}
          </div>
        </div>

        <div className="studio-canvas" ref={canvasBoxRef}>
          {show3D ? (
            <div className="studio-3d" style={{ height: canvasWidth }}>
              <Suspense fallback={<div className="spinner" />}>
                <Mug3DPreview
                  textureUrl={texture3D}
                  widthCm={activeView.area.widthCm}
                  heightCm={printHeightCm(activeView.area, H)}
                />
              </Suspense>
              <span className="studio-3d-hint">Drag to turn the mug</span>
            </div>
          ) : (
            <DesignCanvas
              width={canvasWidth}
              mockup={mockup?.img}
              area={activeView.area}
              H={H}
              layers={layers}
              images={images}
              selectedId={selectedId}
              onSelect={select}
              onChange={updateLayer}
              showGuides={showGuides}
              fontsVersion={fontsVersion}
            />
          )}
        </div>
        <p className="muted small studio-help">
          Drag to move · corner handles resize · top handle rotates · Delete removes · arrow keys nudge.
          Print area: {activeView.area.widthCm} × {printHeightCm(activeView.area, H).toFixed(1)} cm.
        </p>
      </section>

      {/* ---------- Bottom bar: price, quantity, save ---------- */}
      <div className="studio-actions">
        <div className="studio-price">
          <span className="muted small">Price</span>
          <strong>₹{(product.price * quantity).toFixed(2)}</strong>
          {quantity > 1 && <span className="muted small">₹{product.price} each</span>}
        </div>
        <div className="qty">
          <button className="btn btn-secondary btn-sm" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Fewer">−</button>
          <span>{quantity}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setQuantity((q) => Math.min(100, q + 1))} aria-label="More">+</button>
        </div>
        <button className="btn btn-secondary" onClick={() => saveDesign({ addToCart: false })} disabled={Boolean(saving) || !totalLayers}>
          Save design
        </button>
        <button className="btn btn-primary btn-lg" onClick={() => saveDesign({ addToCart: true })} disabled={Boolean(saving) || !totalLayers || product.stock === 0}>
          {saving || (product.stock === 0 ? "Out of stock" : "Add to cart")}
        </button>
      </div>
    </div>
  );
}
