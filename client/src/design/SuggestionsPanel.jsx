// Ready-made layouts for the uploaded photo/logo: free "smart templates", plus AI ideas
// when the server has AI suggestions turned on.
import { useEffect, useMemo, useState } from "react";
import { renderPreview } from "./renderer";
import { materializeSuggestion } from "./suggestions";
import { loadFontsFor } from "./fonts";

function SuggestionCard({ suggestion, image, mockup, area, H, images, onApply, badge }) {
  const [thumb, setThumb] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const layers = materializeSuggestion(suggestion, image);
    // Draw once the fonts are ready so the thumbnail matches the real result
    loadFontsFor(layers).then(() => {
      if (cancelled) return;
      try {
        setThumb(renderPreview({ mockup, area, layers, images, H, width: 240, focus: true, quality: 0.82 }));
      } catch {
        setThumb(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [suggestion, image, mockup, area, H, images]);

  return (
    <button className="suggestion-card" onClick={() => onApply(suggestion)} title={suggestion.description}>
      {thumb ? <img src={thumb} alt={suggestion.name} /> : <div className="suggestion-thumb-loading" />}
      <span className="suggestion-name">
        {badge && <span className="badge badge-brand">{badge}</span>} {suggestion.name}
      </span>
    </button>
  );
}

export default function SuggestionsPanel({
  upload,
  templates,
  ai,
  aiEnabled,
  aiLoading,
  aiError,
  onAskAi,
  brandText,
  onBrandTextChange,
  onApply,
  mockup,
  area,
  H,
  images,
}) {
  // Same object between renders, so the thumbnails are only redrawn when something changes
  const image = useMemo(
    () => (upload ? { assetId: upload.assetId, naturalWidth: upload.width, naturalHeight: upload.height } : null),
    [upload]
  );

  if (!upload) {
    return (
      <p className="muted small studio-empty-note">
        Upload a photo or logo and we'll suggest 3 designs for it.
      </p>
    );
  }
  const cardProps = { image, mockup, area, H, images, onApply };

  return (
    <div className="suggestions">
      <label className="field" style={{ marginBottom: "0.6rem" }}>
        <span className="field-label">Brand or name (optional)</span>
        <input
          className="input"
          value={brandText}
          maxLength={40}
          placeholder="e.g. Acme Corp"
          onChange={(e) => onBrandTextChange(e.target.value)}
        />
      </label>

      <div className="suggestion-grid">
        {templates.map((s, i) => (
          <SuggestionCard key={`t-${i}-${s.name}`} suggestion={s} {...cardProps} />
        ))}
      </div>

      {aiEnabled && (
        <div className="ai-block">
          {ai.length > 0 && (
            <div className="suggestion-grid">
              {ai.map((s, i) => (
                <SuggestionCard key={`ai-${i}-${s.name}`} suggestion={s} badge="AI" {...cardProps} />
              ))}
            </div>
          )}
          <button className="btn btn-secondary btn-sm btn-block" onClick={onAskAi} disabled={aiLoading}>
            {aiLoading ? "Asking the AI designer..." : ai.length ? "✨ Get 3 more AI ideas" : "✨ Ask AI for 3 ideas"}
          </button>
          {aiError && <p className="form-error small">{aiError}</p>}
        </div>
      )}
      <p className="muted small" style={{ marginTop: "0.5rem" }}>Click a layout to use it. You can still change everything afterwards.</p>
    </div>
  );
}
