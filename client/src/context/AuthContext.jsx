import { createContext, useState, useContext, useEffect } from "react";

const AuthContext = createContext();

// Constants for session management
const STORAGE_KEYS = {
  USER: 'flagzen_user',
  TOKEN: 'flagzen_token',
  LAST_ACTIVITY: 'flagzen_last_activity',
  LOGIN_TIME: 'flagzen_login_time'
};

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to update last activity
  const updateLastActivity = () => {
    const now = new Date().getTime();
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, now.toString());
  };

  // Function to check if session is expired
  const isSessionExpired = () => {
    const lastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
    if (!lastActivity) return true;
    
    const now = new Date().getTime();
    const timeSinceLastActivity = now - parseInt(lastActivity);
    return timeSinceLastActivity > SESSION_DURATION;
  };

  // Function to clear all stored session data
  const clearStoredSession = () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  };

  const login = (userData, authToken) => {
    const now = new Date().getTime();
    
    // Store in state
    setUser(userData);
    setToken(authToken);
    setRole(userData?.role || null);
    
    // Store in localStorage for persistence
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    localStorage.setItem(STORAGE_KEYS.TOKEN, authToken);
    localStorage.setItem(STORAGE_KEYS.LOGIN_TIME, now.toString());
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, now.toString());
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setRole(null);
    clearStoredSession();
  };

  // Function to restore session from localStorage
  const restoreSession = () => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      
      if (storedUser && storedToken) {
        // Check if session is expired
        if (isSessionExpired()) {
          console.log('Session expired, logging out');
          clearStoredSession();
          return;
        }
        
        // Restore session
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setToken(storedToken);
        setRole(userData?.role || null);
        
        // Update last activity
        updateLastActivity();
        
        console.log('Session restored successfully');
      }
    } catch (error) {
      console.error('Error restoring session:', error);
      clearStoredSession();
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to restore session on app load
  useEffect(() => {
    restoreSession();
  }, []);

  // Effect to track user activity and update last activity time
  useEffect(() => {
    if (user && token) {
      const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      const handleActivity = () => {
        updateLastActivity();
      };
      
      // Add activity listeners
      activityEvents.forEach(event => {
        document.addEventListener(event, handleActivity, true);
      });
      
      // Set up interval to check for session expiry
      const sessionCheckInterval = setInterval(() => {
        if (isSessionExpired()) {
          console.log('Session expired due to inactivity');
          logout();
        }
      }, 60000); // Check every minute
      
      // Cleanup
      return () => {
        activityEvents.forEach(event => {
          document.removeEventListener(event, handleActivity, true);
        });
        clearInterval(sessionCheckInterval);
      };
    }
  }, [user, token]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      role, 
      login, 
      logout, 
      isLoading,
      updateLastActivity
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);