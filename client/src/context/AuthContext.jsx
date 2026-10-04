import { createContext, useState, useContext, useEffect, useCallback } from "react";
import api from "../utils/api";

const AuthContext = createContext();

// Constants for session management
const STORAGE_KEYS = {
  USER: 'flagzen_user',
  TOKEN: 'flagzen_token',
};
// Keys used by older versions of the app; removed on logout.
const OLD_STORAGE_KEYS = ['flagzen_last_activity', 'flagzen_login_time'];

// Reads the expiry time the server put inside the login token.
// The website uses the same expiry as the server, so both agree on when a login ends.
const getTokenExpiry = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const expiry = getTokenExpiry(token);
  return !expiry || Date.now() >= expiry;
};

// Function to clear all stored session data
const clearStoredSession = () => {
  [...Object.values(STORAGE_KEYS), ...OLD_STORAGE_KEYS].forEach((key) => {
    localStorage.removeItem(key);
  });
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // True after the user pressed "Logout" (members-only pages then go home, not to the login page)
  const [loggedOut, setLoggedOut] = useState(false);

  const login = (userData, authToken) => {
    // Store in state
    setUser(userData);
    setToken(authToken);
    setRole(userData?.role || null);
    setLoggedOut(false);

    // Store in localStorage for persistence
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    localStorage.setItem(STORAGE_KEYS.TOKEN, authToken);
  };

  // Saves changed account details (e.g. a new name, or "email confirmed").
  const updateUser = useCallback((changes) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...changes };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(next));
      setRole(next.role || null);
      return next;
    });
  }, []);

  // Fetches the latest account details (role, seller approval, email status) from the server.
  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      updateUser(res.data.user);
      return res.data.user;
    } catch {
      return null;
    }
  }, [updateUser]);

  // byUser: false when the login simply expired (then the login page is shown)
  const logout = useCallback((byUser = true) => {
    setUser(null);
    setToken(null);
    setRole(null);
    setLoggedOut(byUser);
    clearStoredSession();
    // Only matters for the page the user was on when logging out
    if (byUser) setTimeout(() => setLoggedOut(false), 500);
  }, []);

  // Restore session from localStorage on app load
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

      if (storedUser && storedToken) {
        if (isTokenExpired(storedToken)) {
          console.log('Session expired, logging out');
          clearStoredSession();
          return;
        }

        const userData = JSON.parse(storedUser);
        setUser(userData);
        setToken(storedToken);
        setRole(userData?.role || null);
        // Pick up changes made elsewhere (e.g. an admin approved this seller).
        refreshUser();
      }
    } catch (error) {
      console.error('Error restoring session:', error);
      clearStoredSession();
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser]);

  // Log out automatically when the login token runs out
  useEffect(() => {
    if (!token) return;
    const sessionCheckInterval = setInterval(() => {
      if (isTokenExpired(token)) {
        console.log('Session expired');
        logout(false);
      }
    }, 60000); // Check every minute
    return () => clearInterval(sessionCheckInterval);
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      role,
      login,
      logout,
      isLoading,
      loggedOut,
      updateUser,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
