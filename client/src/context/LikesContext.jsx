// client/src/context/LikesContext.jsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";

const LikesContext = createContext();

const LIKES_STORAGE_KEY = "flagzen_likes";

const loadStoredLikes = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

export const useLikes = () => useContext(LikesContext);
export const LikesProvider = ({ children }) => {
  const { user } = useAuth();
  const [likedItems, setLikedItems] = useState(loadStoredLikes);

  // Save likes so they survive a page refresh.
  useEffect(() => {
    try {
      localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likedItems));
    } catch (err) {
      console.warn("Could not save liked items in this browser:", err);
    }
  }, [likedItems]);

  // Clear likes on logout (same as the cart).
  const previousUser = useRef(user);
  useEffect(() => {
    if (previousUser.current && !user) setLikedItems([]);
    previousUser.current = user;
  }, [user]);

  const toggleLike = (product) => {
    setLikedItems((prev) => {
      const exists = prev.find((item) => item._id === product._id);
      if (exists) {
        return prev.filter((item) => item._id !== product._id); // unlike
      }
      const { _id, name, price, image } = product;
      return [...prev, { _id, name, price, image }]; // like
    });
  };

  return (
    <LikesContext.Provider value={{ likedItems, toggleLike }}>
      {children}
    </LikesContext.Provider>
  );
};
