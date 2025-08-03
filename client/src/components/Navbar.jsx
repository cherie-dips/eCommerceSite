import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useLikes } from "../context/LikesContext";
import { Link } from "react-router-dom";
import like from "../assets/like.png";
import cart from "../assets/shopping-bag.png";
import profile from "../assets/profile.png";

export default function Navbar() {
  const { cartItems } = useCart(); 
  const { likedItems } = useLikes();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/">
          FLAGZEN
        </Link>
        <Link to="/"> 
          Home
        </Link>
        <Link to="/products">Products</Link>
      </div>

      <div className="navbar-right">
        <Link to="/likes">
          <img src={like} alt="Likes" style={{ height: "30px", verticalAlign: "top" }} />
          <span style={{ fontFamily: "sans-serif", fontWeight: "bold", fontSize: "24px", verticalAlign: "top" }}>
            {likedItems.length > 0 && likedItems.length}
          </span>
        </Link>

        {/* ✅ Cart now links to /cart */}
        <Link to="/cart">
          <img src={cart} alt="Cart" style={{ height: "30px", verticalAlign: "top" }} />
          <span style={{ fontFamily: "sans-serif", fontWeight: "bold", fontSize: "24px", verticalAlign: "top" }}>
            {cartItems.length > 0 && cartItems.length}
          </span>
        </Link>

        <div className="login-dropdown-container">
          <button
            className="login-button"
            onClick={() => setShowDropdown((prev) => !prev)}
          >
            <img src={profile} alt="Profile" style={{ height: "30px", verticalAlign: "top" }} />
          </button>
          {showDropdown && (
            <div className="login-dropdown">
              <Link to="/login" onClick={() => setShowDropdown(false)}>
                Login
              </Link>
              <Link to="/register" onClick={() => setShowDropdown(false)}>
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}