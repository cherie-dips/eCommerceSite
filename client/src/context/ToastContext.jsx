import { createContext, useCallback, useContext, useMemo, useState } from "react";

// Small on-page messages (instead of browser alert pop-ups).
// Usage: const toast = useToast(); toast.success("Saved!"); toast.error("Something went wrong");
const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (message, type = "info", duration = 3500) => {
      const id = nextId++;
      setToasts((list) => [...list.slice(-3), { id, message, type }]);
      setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  const toast = useMemo(
    () => ({
      success: (message) => show(message, "success"),
      error: (message) => show(message, "error", 6000),
      info: (message) => show(message, "info"),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{t.message}</span>
            <button onClick={() => remove(t.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
