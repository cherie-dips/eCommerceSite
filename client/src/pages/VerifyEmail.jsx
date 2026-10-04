import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { user, updateUser } = useAuth();
  const [state, setState] = useState({ status: "working", message: "" });
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true; // the link only works once, so don't send it twice
    api
      .post("/auth/verify-email", { token })
      .then((res) => {
        setState({ status: "done", message: res.data.message });
        if (user) updateUser({ emailVerified: true });
      })
      .catch((err) => setState({ status: "error", message: errorMessage(err, "This link is invalid or has expired.") }));
  }, [token, user, updateUser]);

  return (
    <div className="page page-narrow" style={{ textAlign: "center" }}>
      <div className="card">
        {!token ? (
          <p>This confirmation link is incomplete. Please open the full link from the email.</p>
        ) : state.status === "working" ? (
          <>
            <div className="spinner" />
            <p>Confirming your email...</p>
          </>
        ) : state.status === "done" ? (
          <>
            <h2>✅ {state.message}</h2>
            <Link to="/" className="btn btn-primary">Start shopping</Link>
          </>
        ) : (
          <>
            <h2>{state.message}</h2>
            <p className="muted">You can ask for a new link from your <Link to="/profile">profile</Link>.</p>
          </>
        )}
      </div>
    </div>
  );
}
