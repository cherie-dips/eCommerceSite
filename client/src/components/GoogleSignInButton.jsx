import { useEffect, useRef } from "react";

// Renders Google's own "Sign in with Google" button.
// onCredential always sees the latest page values (e.g. the selected Customer/Retailer role),
// because Google calls it through a ref instead of a copy saved when the page first opened.
export default function GoogleSignInButton({ onCredential }) {
  const buttonRef = useRef(null);
  const onCredentialRef = useRef(onCredential);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  });

  useEffect(() => {
    const renderButton = () => {
      const googleId = window.google?.accounts?.id;
      if (!googleId || !buttonRef.current) return false;
      try {
        googleId.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: (response) => onCredentialRef.current(response),
        });
        buttonRef.current.innerHTML = "";
        googleId.renderButton(buttonRef.current, { theme: "outline", size: "large" });
      } catch (e) {
        console.error("Failed to initialize Google SDK:", e);
      }
      return true;
    };

    if (renderButton()) return;

    // Google's script hasn't loaded yet; check again shortly.
    const interval = setInterval(() => {
      if (renderButton()) clearInterval(interval);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return <div ref={buttonRef} className="google-signin-button" />;
}
