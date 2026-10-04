import { useCallback, useRef, useState } from "react";

const LIMIT = 60;

// Undo/redo for the design. set(next, { coalesce: "key" }) merges quick repeated
// changes with the same key (e.g. dragging a slider) into one undo step.
export function useHistory(initial) {
  const [state, setState] = useState({ past: [], present: initial, future: [] });
  const last = useRef({ key: null, time: 0 });

  const set = useCallback((updater, { coalesce } = {}) => {
    const now = Date.now();
    const merge = Boolean(coalesce) && coalesce === last.current.key && now - last.current.time < 1000;
    last.current = { key: coalesce || null, time: now };
    setState((s) => {
      const next = typeof updater === "function" ? updater(s.present) : updater;
      if (next === s.present) return s;
      return {
        past: merge ? s.past : [...s.past.slice(-LIMIT), s.present],
        present: next,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    last.current = { key: null, time: 0 };
    setState((s) => (s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s));
  }, []);

  const redo = useCallback(() => {
    last.current = { key: null, time: 0 };
    setState((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s));
  }, []);

  // Replace everything (e.g. when a saved design is opened) and forget the history.
  const reset = useCallback((value) => setState({ past: [], present: value, future: [] }), []);

  return {
    value: state.present,
    set,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
