import { useState, useEffect, useRef } from "react";
import { useCart } from "../context/CartContext";
import { useLikes } from "../context/LikesContext";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Navbar.css";
import RedeemOutlinedIcon from '@mui/icons-material/RedeemOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import LocalMallOutlinedIcon from '@mui/icons-material/LocalMallOutlined';
import PermIdentityOutlinedIcon from '@mui/icons-material/PermIdentityOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined';

export default function Navbar() {
  const { itemCount } = useCart();
  const { likedItems } = useLikes();
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, role, logout } = useAuth();
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close the menu after moving to another page
  useEffect(() => setShowDropdown(false), [location.pathname]);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-logo text-black"> FLAGZEN </Link>
        <NavLink to="/" end className="navbar-icon-link" title="Home">
          <HomeOutlinedIcon alt="Home" className="navbar-icon" />
        </NavLink>
        <NavLink to="/products" className="navbar-icon-link" title="Products">
          <RedeemOutlinedIcon alt="Products" className="navbar-icon" />
        </NavLink>
        <NavLink to="/customize" className="navbar-icon-link navbar-text-link" title="Design your own">
          <BrushOutlinedIcon className="navbar-icon" />
          <span className="navbar-link-label">Design</span>
        </NavLink>
      </div>

      <div className="navbar-right">
        {user && (role === "retailer" || role === "admin") && (
          <NavLink to="/retailer/products/new" className="navbar-icon-link" title="Add a product">
            <FileUploadOutlinedIcon alt="Upload" className="navbar-icon" />
          </NavLink>
        )}
        <NavLink to="/likes" className="navbar-icon-link" title="Liked products">
          <FavoriteBorderOutlinedIcon alt="Likes" className="navbar-icon" />
          {likedItems.length > 0 && (
            <span className="navbar-badge">{likedItems.length}</span>
          )}
        </NavLink>

        <NavLink to="/cart" className="navbar-icon-link" title="Cart">
          <LocalMallOutlinedIcon alt="Cart" className="navbar-icon" />
          {itemCount > 0 && (
            <span className="navbar-badge">{itemCount}</span>
          )}
        </NavLink>

        <div className="login-dropdown-container" ref={dropdownRef}>
          <button
            className="login-button"
            onClick={() => setShowDropdown((prev) => !prev)}
            aria-label="Account menu"
            aria-expanded={showDropdown}
          >
            <PermIdentityOutlinedIcon alt="Profile" className="navbar-icon" />
          </button>
          {showDropdown && (
            <div className="login-dropdown">
              {!user && (
                <>
                  <Link to="/login">Login</Link>
                  <Link to="/register">Register</Link>
                </>
              )}
              {user && (
                <>
                  <div className="dropdown-user">{user.username}</div>
                  <Link to="/orders">My Orders</Link>
                  <Link to="/designs">My Designs</Link>
                  <Link to="/profile">Profile</Link>
                </>
              )}
              {user && (role === "retailer" || role === "admin") && (
                <>
                  <div className="dropdown-divider" />
                  <Link to="/retailer/products">Seller: Products</Link>
                  <Link to="/retailer/orders">Seller: Orders</Link>
                </>
              )}
              {user && role === "admin" && <Link to="/admin">Admin Panel</Link>}
              {user && (
                <>
                  <div className="dropdown-divider" />
                  <button className="dropdown-logout" onClick={() => { logout(); setShowDropdown(false); navigate("/"); }}>
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
