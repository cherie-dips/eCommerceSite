// Layout for the log in / sign up / password pages: a studio panel on the left and the
// form on the right (the panel is hidden on phones).
import { Link } from "react-router-dom";

export default function AuthShell({ eyebrow, title, children }) {
  return (
    <div className="auth">
      <aside className="auth-art" aria-hidden="true">
        <Link to="/" className="auth-art-logo" tabIndex={-1}>
          Flagzen<span />
        </Link>
        <div className="auth-art-glow" />
        <div className="auth-art-chips">
          <span>Live 3D preview</span>
          <span>Front &amp; back</span>
          <span>Print-ready files</span>
        </div>
        <p className="display auth-art-quote">
          Design it in <em>3D.</em>
          <br />
          Order it for real.
        </p>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          {title && <h1 className="auth-title">{title}</h1>}
          {children}
        </div>
      </main>
    </div>
  );
}
