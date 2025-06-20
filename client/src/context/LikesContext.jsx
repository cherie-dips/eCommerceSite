// client/src/context/LikesContext.jsx
import React, { createContext, useContext, useState } from "react";

const LikesContext = createContext();

export const useLikes = () => useContext(LikesContext);
export const LikesProvider = ({ children }) => {
  const [likedItems, setLikedItems] = useState([]);

  const toggleLike = (product) => {
    setLikedItems((prev) => {
      const exists = prev.find((item) => item._id === product._id);
      if (exists) {
        return prev.filter((item) => item._id !== product._id); // unlike
      }
      return [...prev, product]; // like
    });
  };

  return (
    <LikesContext.Provider value={{ likedItems, toggleLike }}>
      {children}
    </LikesContext.Provider>
  );
};
