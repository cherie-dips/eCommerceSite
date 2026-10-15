import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="page page-narrow not-found">
      <span className="eyebrow">Error 404</span>
      <p className="display not-found-code">4<em>0</em>4</p>
      <h1 className="display">This page wandered off the <em>print area.</em></h1>
      <p className="muted">The page you were looking for doesn't exist or has moved.</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <Link to="/" className="btn btn-primary">Back to home</Link>
        <Link to="/customize" className="btn btn-secondary">Browse products</Link>
      </div>
    </div>
  );
}
