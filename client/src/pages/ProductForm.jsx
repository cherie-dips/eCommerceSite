// Add or edit a product (sellers): photos for each side, where designs can be printed,
// price, stock and category.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { assetUrl, errorMessage } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import PrintAreaEditor from "../components/PrintAreaEditor";

const DEFAULT_AREA = { x: 0.3, y: 0.28, width: 0.4, height: 0.4, widthCm: 20 };
const SIDES = [
  ["front", "Front photo (main)"],
  ["back", "Back photo (optional)"],
  ["side", "Side photo (optional)"],
];

const emptyForm = {
  name: "",
  description: "",
  category: "Other",
  price: "",
  stock: 100,
  customizable: true,
  model3d: "",
  photos: { front: "", back: "", side: "" },
  printAreas: { front: DEFAULT_AREA },
};

export default function ProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [uploading, setUploading] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    refreshUser();
    api.get("/products/categories").then((res) => setCategories(res.data)).catch(() => {});
  }, [refreshUser]);

  // Load the product being edited (sellers can also edit products they removed from the store)
  useEffect(() => {
    if (!editing) return;
    const fill = (p) =>
      setForm({
        name: p.name,
        description: p.description || "",
        category: p.category || "Other",
        price: p.price,
        stock: p.stock ?? 0,
        customizable: p.customizable !== false,
        model3d: p.model3d || "",
        photos: { front: p.image, back: p.images?.back || "", side: p.images?.side || "" },
        printAreas: { front: p.printAreas?.front || DEFAULT_AREA, ...(p.printAreas?.back && { back: p.printAreas.back }), ...(p.printAreas?.side && { side: p.printAreas.side }) },
        active: p.active !== false,
      });
    api
      .get("/retailer-products")
      .then((res) => {
        const product = res.data.find((p) => p._id === id);
        if (product) return fill(product);
        return api.get(`/products/${id}`).then((r) => fill(r.data));
      })
      .catch(() => setError("This product couldn't be loaded."))
      .finally(() => setLoading(false));
  }, [editing, id]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const uploadPhoto = async (side, file) => {
    if (!file) return;
    setUploading(side);
    try {
      const data = new FormData();
      data.append("image", file);
      const res = await api.post("/products/upload-image", data, { timeout: 120000 });
      setForm((f) => ({
        ...f,
        photos: { ...f.photos, [side]: res.data.path },
        printAreas: { ...f.printAreas, [side]: f.printAreas[side] || DEFAULT_AREA },
      }));
    } catch (err) {
      toast.error(errorMessage(err, "The photo couldn't be uploaded."));
    } finally {
      setUploading("");
    }
  };

  const removePhoto = (side) =>
    setForm((f) => {
      const printAreas = { ...f.printAreas };
      delete printAreas[side];
      return { ...f, photos: { ...f.photos, [side]: "" }, printAreas };
    });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.photos.front) {
      setError("Please upload a front photo.");
      return;
    }
    setSaving(true);
    const body = {
      name: form.name,
      description: form.description,
      category: form.category,
      price: Number(form.price),
      stock: Number(form.stock),
      customizable: form.customizable,
      model3d: form.model3d,
      image: form.photos.front,
      images: { back: form.photos.back || undefined, side: form.photos.side || undefined },
      printAreas: Object.fromEntries(Object.entries(form.printAreas).filter(([side]) => form.photos[side])),
    };
    try {
      if (editing) await api.put(`/products/${id}`, body);
      else await api.post("/products", body);
      toast.success(editing ? "Product updated." : "Product added to your store.");
      navigate("/retailer/products");
    } catch (err) {
      setError(errorMessage(err, "The product couldn't be saved."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page"><div className="spinner" /></div>;
  const waiting = user?.role === "retailer" && user?.approved === false;

  return (
    <div className="page page-narrow" style={{ maxWidth: 880 }}>
      <div className="page-header">
        <div>
          <Link to="/retailer/products" className="small">← My products</Link>
          <h1>{editing ? "Edit product" : "Add a product"}</h1>
        </div>
      </div>

      {waiting && (
        <div className="notice notice-warning">
          Your seller account is waiting for approval by the Flagzen team. You can add products once it's approved.
        </div>
      )}

      <form onSubmit={submit}>
        <div className="card">
          <h2 className="section-title">Details</h2>
          <div className="field">
            <label>Product name</label>
            <input className="input" value={form.name} onChange={set("name")} required maxLength={120} placeholder="e.g. Classic White Mug" />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="textarea" value={form.description} onChange={set("description")} maxLength={2000} placeholder="Material, size, care instructions..." />
          </div>
          <div className="grid-3">
            <div className="field">
              <label>Category</label>
              <select className="select" value={form.category} onChange={set("category")}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Price (₹)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.price} onChange={set("price")} required />
            </div>
            <div className="field">
              <label>Stock</label>
              <input className="input" type="number" min="0" step="1" value={form.stock} onChange={set("stock")} required />
              <span className="hint">How many blank items you have.</span>
            </div>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={form.customizable} onChange={set("customizable")} /> Customers can add their own design
          </label>
          {form.customizable && (
            <div className="field" style={{ marginTop: "0.8rem", maxWidth: 300 }}>
              <label>3D preview</label>
              <select className="select" value={form.model3d} onChange={set("model3d")}>
                <option value="">None</option>
                <option value="mug">Mug</option>
              </select>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="section-title">Photos{form.customizable ? " and print areas" : ""}</h2>
          <p className="muted small">
            Use a plain photo of the blank product on a light background, square if possible.
            {form.customizable && " Drag and resize the dashed box to show where designs can be printed."}
          </p>
          {SIDES.map(([side, label]) => {
            const photo = form.photos[side];
            if (side !== "front" && !form.photos.front) return null;
            return (
              <div key={side} className="photo-side">
                <div className="row-between">
                  <strong>{label}</strong>
                  <div className="row">
                    <label className="btn btn-secondary btn-sm">
                      {uploading === side ? "Uploading..." : photo ? "Replace photo" : "Upload photo"}
                      <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => uploadPhoto(side, e.target.files[0])} />
                    </label>
                    {photo && side !== "front" && <button type="button" className="btn btn-ghost btn-sm" onClick={() => removePhoto(side)}>Remove</button>}
                  </div>
                </div>
                {photo && (
                  <div className="photo-side-body">
                    {form.customizable ? (
                      <PrintAreaEditor
                        imageUrl={assetUrl(photo)}
                        value={form.printAreas[side] || DEFAULT_AREA}
                        onChange={(area) => setForm((f) => ({ ...f, printAreas: { ...f.printAreas, [side]: area } }))}
                      />
                    ) : (
                      <img src={assetUrl(photo)} alt="" style={{ width: 240, borderRadius: 10 }} />
                    )}
                    {form.customizable && (
                      <div className="field" style={{ maxWidth: 220 }}>
                        <label>Printed width (cm)</label>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          max="200"
                          step="0.5"
                          value={(form.printAreas[side] || DEFAULT_AREA).widthCm}
                          onChange={(e) => setForm((f) => ({ ...f, printAreas: { ...f.printAreas, [side]: { ...(f.printAreas[side] || DEFAULT_AREA), widthCm: Number(e.target.value) } } }))}
                        />
                        <span className="hint">Real width of the box on the product. Used to warn customers about blurry images and to size print files.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <div className="notice notice-danger">{error}</div>}
        <div className="row">
          <button className="btn btn-primary btn-lg" disabled={saving || waiting || Boolean(uploading)}>
            {saving ? "Saving..." : editing ? "Save changes" : "Add product"}
          </button>
          <Link to="/retailer/products" className="btn btn-secondary btn-lg">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
