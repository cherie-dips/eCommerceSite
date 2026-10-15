// The floating navigation bar: logo, main links, likes, cart and the account menu.
// On phones the links move into the menu.
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { PiHandbagSimple, PiHeart, PiList, PiX } from "react-icons/pi";
import { useCart } from "../context/CartContext";
import { useLikes } from "../context/LikesContext";
import { useAuth } from "../context/AuthContext";
import "../styles/Navbar.css";

export default function Navbar() {
  const { itemCount } = useCart();
  const { likedItems } = useLikes();
  const { user, role, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isSeller = role === "retailer" || role === "admin";

  // Close the menu when clicking outside it, pressing Escape, or changing page
  useEffect(() => {
    const onClick = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const logOut = () => {
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="nav-wrap">
      <nav className="nav glass" aria-label="Main">
        <Link to="/" className="nav-logo" aria-label="Flagzen home">
          Flagzen<span className="nav-logo-dot" />
        </Link>

        <div className="nav-links">
          <NavLink to="/customize">Design</NavLink>
          <a href="/#how-it-works">How it works</a>
          {user && <NavLink to="/designs">My designs</NavLink>}
          {isSeller && <NavLink to="/retailer/products">Seller studio</NavLink>}
        </div>

        <div className="nav-actions">
          <NavLink to="/likes" className="nav-icon" aria-label={`Liked products (${likedItems.length})`} title="Liked">
            <PiHeart />
            {likedItems.length > 0 && <span className="nav-count">{likedItems.length}</span>}
          </NavLink>
          <NavLink to="/cart" className="nav-icon" aria-label={`Cart (${itemCount})`} title="Cart">
            <PiHandbagSimple />
            {itemCount > 0 && <span className="nav-count">{itemCount}</span>}
          </NavLink>

          {!user && (
            <Link to="/login" className="nav-login">Log in</Link>
          )}

          <div className="nav-menu" ref={menuRef}>
            <button
              className={user ? "nav-avatar" : "nav-icon nav-burger"}
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              {user ? (user.username || user.email || "?").trim().charAt(0).toUpperCase() : menuOpen ? <PiX /> : <PiList />}
            </button>
            {menuOpen && (
              <div className="nav-panel glass" role="menu">
                {user && (
                  <div className="nav-panel-user">
                    <strong>{user.username}</strong>
                    <span>{user.email}</span>
                  </div>
                )}
                <div className="nav-panel-links nav-panel-main">
                  <Link to="/customize">Design</Link>
                  <a href="/#how-it-works">How it works</a>
                </div>
                {user ? (
                  <div className="nav-panel-links">
                    <Link to="/orders">My orders</Link>
                    <Link to="/designs">My designs</Link>
                    <Link to="/likes">Liked</Link>
                    <Link to="/profile">Profile</Link>
                  </div>
                ) : (
                  <div className="nav-panel-links">
                    <Link to="/login">Log in</Link>
                    <Link to="/register">Create an account</Link>
                  </div>
                )}
                {isSeller && (
                  <div className="nav-panel-links">
                    <span className="nav-panel-label">Seller</span>
                    <Link to="/retailer/products">Products</Link>
                    <Link to="/retailer/products/new">Add a product</Link>
                    <Link to="/retailer/orders">Orders</Link>
                    {role === "admin" && <Link to="/admin">Admin</Link>}
                  </div>
                )}
                {user && (
                  <button className="nav-logout" onClick={logOut}>Log out</button>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
