import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useLikes } from "../context/LikesContext";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import like from "../assets/like.png";
import cart from "../assets/shopping-bag.png";
import profile from "../assets/profile.png";
import home from "../assets/home.png";

export default function Navbar() {
  const { cartItems, toggleCart } = useCart();
  const { likedItems } = useLikes();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/">
          <img
            src={logo} 
            alt="Logo"
            style={{ height: "60px", verticalAlign: "middle" }}
          />
        </Link>
        <Link to="/">
          <img src={home} alt="Home" style={{ height: "40px", verticalAlign: "middle" }} />
        </Link>
        <Link to="/products">Products</Link>
      </div>

      <div className="navbar-right">
        <Link to="/likes">
          <img src={like} alt="Likes" style={{ height: "40px", verticalAlign: "middle" }} /> 
          <span style={{ fontFamily: "sans-serif", fontWeight: "bold", fontSize: "24px", verticalAlign: "bottom"}}>
            {likedItems.length > 0 && likedItems.length}
          </span>
        </Link>
        <Link to="#" onClick={toggleCart}>
          <img src={cart} alt="Cart" style={{ height: "40px", verticalAlign: "middle" }} />
          <span style={{ fontFamily: "sans-serif", fontWeight: "bold", fontSize: "24px" }}>
            {cartItems.length>0 && cartItems.length}
          </span>
        </Link>
        <div className="login-dropdown-container">
          <button
            className="login-button"
            onClick={() => setShowDropdown((prev) => !prev)}
          >
            <img src={profile} alt="Profile" style={{ height: "40px", verticalAlign: "middle" }} />
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