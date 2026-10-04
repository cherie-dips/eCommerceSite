// Star rating display, e.g. <Stars value={4.2} count={12} />
export default function Stars({ value = 0, count, size = "1rem" }) {
  const rounded = Math.round(value);
  return (
    <span className="stars" style={{ fontSize: size }} title={count ? `${value} out of 5 (${count} reviews)` : "No reviews yet"}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rounded ? "" : "off"}>★</span>
      ))}
      {count !== undefined && <span className="muted small" style={{ marginLeft: 6, letterSpacing: 0 }}>{count ? `${value} (${count})` : "No reviews"}</span>}
    </span>
  );
}
