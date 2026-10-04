import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="page page-narrow" style={{ textAlign: "center" }}>
      <div className="empty">
        <h3>Page not found</h3>
        <p>The page you were looking for doesn't exist.</p>
        <Link to="/" className="btn btn-primary">Go to the home page</Link>
      </div>
    </div>
  );
}
