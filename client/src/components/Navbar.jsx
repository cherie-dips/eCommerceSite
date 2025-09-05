import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useLikes } from "../context/LikesContext";
import { Link } from "react-router-dom";
import like from "../assets/like.png";
import cart from "../assets/shopping-bag.gif";
import profile from "../assets/profile.png";
import home from "../assets/home.png";
import customize from "../assets/customize.gif";
import "../styles/Navbar.css";

export default function Navbar() {
  const { cartItems } = useCart(); 
  const { likedItems } = useLikes();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-logo text-black"> FLAGZEN </Link>
        <Link to="/" className="navbar-icon-link">
          <img src={home} alt="Home" className="navbar-icon" />
        </Link>
        <Link to="/products" className="navbar-icon-link">
          <img src={customize} alt="Customize" className="navbar-icon" />
        </Link>
      </div>

      <div className="navbar-right">
        <Link to="/likes" className="navbar-icon-link">
          <img src={like} alt="Likes" className="navbar-icon" />
          {likedItems.length > 0 && (
            <span className="navbar-badge">{likedItems.length}</span>
          )}
        </Link>

        <Link to="/cart" className="navbar-icon-link">
          <img src={cart} alt="Cart" className="navbar-icon" />
          {cartItems.length > 0 && (
            <span className="navbar-badge">{cartItems.length}</span>
          )}
        </Link>

        <div className="login-dropdown-container">
          <button
            className="login-button"
            onClick={() => setShowDropdown((prev) => !prev)}
          >
            <img src={profile} alt="Profile" className="navbar-icon" />
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