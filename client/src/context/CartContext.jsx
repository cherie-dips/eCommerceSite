import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { assetUrl } from "../utils/api";

const CartContext = createContext();

const CART_STORAGE_KEY = "flagzen_cart";

// Keep in sync with DISCOUNT_CODES in server/routes/orders.js (the server re-checks the code).
const DISCOUNT_CODES = { SAVE10: 0.1 };

const loadStoredCart = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
    const items = Array.isArray(stored?.items) ? stored.items : [];
    return {
      // Lines saved by an older version kept the design picture in the browser only;
      // they can't be ordered with their design any more, so they are dropped.
      items: items.filter((item) => item.cartId && !(item.customImage && !item.designId)),
      address: stored?.address?.line ? stored.address : null,
      discountCode: stored?.discountCode || null,
    };
  } catch {
    return { items: [], address: null, discountCode: null };
  }
};

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [initialCart] = useState(loadStoredCart);
  const [cartItems, setCartItems] = useState(initialCart.items);
  const [address, setAddress] = useState(initialCart.address);
  const [discountCode, setDiscountCode] = useState(initialCart.discountCode);

  // Save the cart so it survives a page refresh.
  useEffect(() => {
    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({ items: cartItems, address, discountCode })
      );
    } catch (err) {
      console.warn("Could not save the cart in this browser:", err);
    }
  }, [cartItems, address, discountCode]);

  // Empty the cart when the user logs out, so the next person on this computer
  // doesn't see their designs or address.
  const previousUser = useRef(user);
  useEffect(() => {
    if (previousUser.current && !user) {
      setCartItems([]);
      setAddress(null);
      setDiscountCode(null);
    }
    previousUser.current = user;
  }, [user]);

  // design (optional): a saved design from the server ({ _id, previewPath }).
  // Plain products are merged into one line; every design gets its own line.
  const addToCart = (product, design = null, quantity = 1) => {
    setCartItems((prev) => {
      if (!design) {
        const existing = prev.find((i) => i.cartId === product._id);
        if (existing) {
          return prev.map((i) =>
            i.cartId === product._id ? { ...i, quantity: i.quantity + quantity } : i
          );
        }
        return [
          ...prev,
          { cartId: product._id, _id: product._id, name: product.name, price: product.price, image: assetUrl(product.image), quantity },
        ];
      }

      return [
        ...prev,
        {
          cartId: `${product._id}-${design._id}`,
          _id: product._id,
          name: product.name,
          price: product.price,
          image: assetUrl(design.previewPath),
          designId: design._id,
          quantity,
        },
      ];
    });
  };

  const removeFromCart = (cartId) => {
    setCartItems((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const increaseQuantity = (cartId) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.cartId === cartId ? { ...item, quantity: Math.min(100, item.quantity + 1) } : item
      )
    );
  };

  const decreaseQuantity = (cartId) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.cartId === cartId ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setDiscountCode(null);
  };

  // Returns the discount rate (e.g. 0.1), or 0 if the code is invalid.
  // An invalid code removes any applied discount.
  const applyDiscount = (code) => {
    const normalized = code.trim().toUpperCase();
    const rate = DISCOUNT_CODES[normalized] || 0;
    setDiscountCode(rate ? normalized : null);
    return rate;
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountRate = discountCode ? DISCOUNT_CODES[discountCode] || 0 : 0;
  const discountAmount = subtotal * discountRate;
  const total = subtotal - discountAmount;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
        address,
        setAddress,
        discountCode,
        discountRate,
        applyDiscount,
        subtotal,
        discountAmount,
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
