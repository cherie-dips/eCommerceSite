import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useLikes } from "../context/LikesContext";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import addIcon from "../assets/upload.png";
import "../styles/Navbar.css";
import RedeemOutlinedIcon from '@mui/icons-material/RedeemOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import LocalMallOutlinedIcon from '@mui/icons-material/LocalMallOutlined';
import PermIdentityOutlinedIcon from '@mui/icons-material/PermIdentityOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';

export default function Navbar() {
  const { cartItems } = useCart(); 
  const { likedItems } = useLikes();
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, role, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-logo text-black"> FLAGZEN </Link>
        <Link to="/" className="navbar-icon-link">
          <HomeOutlinedIcon alt="Home" className="navbar-icon" />
        </Link>
        <Link to="/products" className="navbar-icon-link">
          <RedeemOutlinedIcon alt="Products" className="navbar-icon" />
        </Link>
      </div>

      <div className="navbar-right">
        {user && role === "retailer" && (
          <Link to="/retailer/upload" className="navbar-icon-link" title="Upload Product">
            <FileUploadOutlinedIcon alt="Upload" className="navbar-icon" />
          </Link>
        )}
        <Link to="/likes" className="navbar-icon-link">
          <FavoriteBorderOutlinedIcon alt="Likes" className="navbar-icon" />
          {likedItems.length > 0 && (
            <span className="navbar-badge">{likedItems.length}</span>
          )}
        </Link>

        <Link to="/cart" className="navbar-icon-link">
          <LocalMallOutlinedIcon alt="Cart" className="navbar-icon" />
          {cartItems.length > 0 && (
            <span className="navbar-badge">{cartItems.length}</span>
          )}
        </Link>

        <div className="login-dropdown-container">
          <button
            className="login-button"
            onClick={() => setShowDropdown((prev) => !prev)}
          >
            <PermIdentityOutlinedIcon alt="Profile" className="navbar-icon" />
          </button>
          {showDropdown && (
            <div className="login-dropdown">
              {!user && (
                <>
                  <Link to="/login" onClick={() => setShowDropdown(false)}>
                    Login
                  </Link>
                  <Link to="/register" onClick={() => setShowDropdown(false)}>
                    Register
                  </Link>
                </>
              )}
              {user && role === "retailer" && (
                <>
                  <Link to="/retailer/products" onClick={() => setShowDropdown(false)}>
                    My Products
                  </Link>
                  <Link to="/retailer/orders" onClick={() => setShowDropdown(false)}>
                    Orders
                  </Link>
                </>
              )}
              {user && (
                <>
                  <button onClick={() => { logout(); setShowDropdown(false); }} style={{ width: "100%", textAlign: "left", color: "white" }}>
                    Logout
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}