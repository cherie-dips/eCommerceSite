// List of everything in the design (top layer first), with quick controls.
import { imageDpi, layerLabel, LOW_DPI } from "./designUtils";

const ICONS = { image: "🖼", text: "T", rect: "▭", ellipse: "◯" };

export default function LayerPanel({ layers, selectedId, area, onSelect, onMove, onToggle, onRemove }) {
  if (!layers.length) {
    return <p className="muted small studio-empty-note">Nothing here yet. Upload a photo or logo, or add text.</p>;
  }
  const topFirst = [...layers].reverse();
  return (
    <ul className="layer-list">
      {topFirst.map((layer, i) => {
        const dpi = imageDpi(layer, area);
        return (
          <li
            key={layer.id}
            className={`layer-row ${layer.id === selectedId ? "selected" : ""} ${layer.hidden ? "is-hidden" : ""}`}
            onClick={() => onSelect(layer.id)}
          >
            <span className={`layer-icon layer-icon-${layer.type}`}>{ICONS[layer.type]}</span>
            <span className="layer-name" title={layerLabel(layer)}>{layerLabel(layer)}</span>
            {dpi !== null && dpi < LOW_DPI && <span className="layer-warn" title={`Low print quality (${dpi} DPI)`}>!</span>}
            <span className="layer-actions" onClick={(e) => e.stopPropagation()}>
              <button className="icon-btn" title="Bring forward" disabled={i === 0} onClick={() => onMove(layer.id, 1)}>↑</button>
              <button className="icon-btn" title="Send backward" disabled={i === topFirst.length - 1} onClick={() => onMove(layer.id, -1)}>↓</button>
              <button className="icon-btn" title={layer.hidden ? "Show" : "Hide"} onClick={() => onToggle(layer.id, "hidden")}>{layer.hidden ? "◌" : "●"}</button>
              <button className="icon-btn" title={layer.locked ? "Unlock" : "Lock"} onClick={() => onToggle(layer.id, "locked")}>{layer.locked ? "🔒" : "🔓"}</button>
              <button className="icon-btn danger" title="Remove" onClick={() => onRemove(layer.id)}>✕</button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
