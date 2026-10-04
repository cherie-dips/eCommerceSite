// Settings for the selected layer.
import { DESIGN_WIDTH, imageDpi, LOW_DPI } from "./designUtils";
import { FONTS } from "./fonts";

const BASIC_COLORS = ["#111111", "#ffffff", "#7c0034", "#1d4ed8", "#15803d", "#f59e0b", "#e11d48", "#6b7280"];

function Slider({ label, value, min, max, step = 1, onChange, suffix = "" }) {
  return (
    <label className="prop-slider">
      <span className="prop-label">
        {label} <b>{Math.round(value * 100) / 100}{suffix}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function ColorPicker({ label, value, onChange, palette }) {
  const colors = [...new Set([...(palette || []), ...BASIC_COLORS])].slice(0, 12);
  return (
    <div className="prop-field">
      <span className="prop-label">{label}</span>
      <div className="swatches">
        {colors.map((c) => (
          <button
            key={c}
            className={`swatch ${value?.toLowerCase() === c.toLowerCase() ? "active" : ""}`}
            style={{ background: c }}
            title={c}
            onClick={() => onChange(c)}
          />
        ))}
        <input type="color" className="swatch-input" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} title="Pick any colour" />
      </div>
    </div>
  );
}

export default function PropertiesPanel({ layer, H, area, palette, onChange, onDuplicate, onRemove }) {
  if (!layer) {
    return <p className="muted small studio-empty-note">Click something in the design to change it.</p>;
  }
  // `key` groups quick repeated changes (like dragging a slider) into one undo step
  const set = (changes, key) => onChange(layer.id, changes, key);
  const dpi = imageDpi(layer, area);

  return (
    <div className="props">
      <div className="prop-row">
        <button className="btn btn-secondary btn-sm" onClick={() => set({ x: DESIGN_WIDTH / 2 })}>Centre ↔</button>
        <button className="btn btn-secondary btn-sm" onClick={() => set({ y: H / 2 })}>Centre ↕</button>
        <button className="btn btn-secondary btn-sm" onClick={() => set({ rotation: 0 })}>Straighten</button>
      </div>

      {layer.type === "image" && (
        <>
          {dpi !== null && dpi < LOW_DPI && (
            <div className="notice notice-warning small">
              This image may print blurry at this size ({dpi} DPI). Make it smaller or upload a bigger image.
            </div>
          )}
          <div className="prop-field">
            <span className="prop-label">Shape</span>
            <div className="segmented">
              {[["none", "Original"], ["rounded", "Rounded"], ["circle", "Circle"]].map(([value, label]) => (
                <button
                  key={value}
                  className={layer.frame === value ? "active" : ""}
                  onClick={() =>
                    set({
                      frame: value,
                      height: value === "circle" ? layer.width : layer.width * (layer.naturalHeight / layer.naturalWidth || 1),
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => set({ flipX: !layer.flipX })}>Flip ⇋</button>
        </>
      )}

      {layer.type === "text" && (
        <>
          <div className="prop-field">
            <span className="prop-label">Text</span>
            <textarea className="textarea" rows={2} value={layer.text} onChange={(e) => set({ text: e.target.value }, "text")} />
          </div>
          <div className="prop-field">
            <span className="prop-label">Font</span>
            <select className="select" value={layer.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })} style={{ fontFamily: layer.fontFamily }}>
              {FONTS.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </select>
          </div>
          <Slider label="Size" value={layer.fontSize} min={20} max={400} onChange={(v) => set({ fontSize: v }, "fontSize")} />
          <div className="prop-row">
            <div className="segmented">
              <button
                className={layer.fontStyle?.includes("bold") ? "active" : ""}
                onClick={() => {
                  const bold = !layer.fontStyle?.includes("bold");
                  const italic = layer.fontStyle?.includes("italic");
                  set({ fontStyle: [bold && "bold", italic && "italic"].filter(Boolean).join(" ") || "normal" });
                }}
              ><b>B</b></button>
              <button
                className={layer.fontStyle?.includes("italic") ? "active" : ""}
                onClick={() => {
                  const italic = !layer.fontStyle?.includes("italic");
                  const bold = layer.fontStyle?.includes("bold");
                  set({ fontStyle: [bold && "bold", italic && "italic"].filter(Boolean).join(" ") || "normal" });
                }}
              ><i>I</i></button>
              <button className={layer.textDecoration === "underline" ? "active" : ""} onClick={() => set({ textDecoration: layer.textDecoration === "underline" ? "" : "underline" })}><u>U</u></button>
            </div>
            <div className="segmented">
              {["left", "center", "right"].map((a) => (
                <button key={a} className={layer.align === a ? "active" : ""} onClick={() => set({ align: a })} title={`Align ${a}`}>
                  {a === "left" ? "⇤" : a === "right" ? "⇥" : "↔"}
                </button>
              ))}
            </div>
          </div>
          <ColorPicker label="Colour" value={layer.fill} palette={palette} onChange={(c) => set({ fill: c }, "fill")} />
          <Slider label="Letter spacing" value={layer.letterSpacing || 0} min={-5} max={40} onChange={(v) => set({ letterSpacing: v }, "letterSpacing")} />
          <Slider label="Outline" value={layer.strokeWidth || 0} min={0} max={20} onChange={(v) => set({ strokeWidth: v, stroke: layer.stroke || "#ffffff" }, "strokeWidth")} />
          {layer.strokeWidth > 0 && (
            <ColorPicker label="Outline colour" value={layer.stroke} palette={palette} onChange={(c) => set({ stroke: c }, "stroke")} />
          )}
        </>
      )}

      {(layer.type === "rect" || layer.type === "ellipse") && (
        <>
          <ColorPicker label="Fill" value={layer.fill} palette={palette} onChange={(c) => set({ fill: c }, "fill")} />
          <Slider label="Outline" value={layer.strokeWidth || 0} min={0} max={40} onChange={(v) => set({ strokeWidth: v, stroke: layer.stroke || "#111111" }, "strokeWidth")} />
          {layer.strokeWidth > 0 && (
            <ColorPicker label="Outline colour" value={layer.stroke} palette={palette} onChange={(c) => set({ stroke: c }, "stroke")} />
          )}
          {layer.type === "rect" && (
            <Slider label="Rounded corners" value={layer.cornerRadius || 0} min={0} max={Math.round(Math.min(layer.width, layer.height) / 2)} onChange={(v) => set({ cornerRadius: v }, "cornerRadius")} />
          )}
        </>
      )}

      <Slider label="Opacity" value={Math.round((layer.opacity ?? 1) * 100)} min={10} max={100} suffix="%" onChange={(v) => set({ opacity: v / 100 }, "opacity")} />
      <Slider label="Rotation" value={Math.round(layer.rotation || 0)} min={-180} max={180} suffix="°" onChange={(v) => set({ rotation: v }, "rotation")} />

      <div className="prop-row">
        <button className="btn btn-secondary btn-sm" onClick={() => onDuplicate(layer.id)}>Duplicate</button>
        <button className="btn btn-danger btn-sm" onClick={() => onRemove(layer.id)}>Remove</button>
      </div>
    </div>
  );
}
