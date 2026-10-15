import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-top">
          <div className="site-footer-brand">
            <p className="display">Make it <em>yours.</em></p>
            <p>Custom merch, designed in 3D in your browser and printed for your team.</p>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              <li><Link to="/customize">All products</Link></li>
              <li><Link to="/customize?category=Apparel">Apparel</Link></li>
              <li><Link to="/customize?category=Drinkware">Drinkware</Link></li>
              <li><Link to="/customize?category=Bags">Bags</Link></li>
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              <li><Link to="/orders">My orders</Link></li>
              <li><Link to="/designs">My designs</Link></li>
              <li><Link to="/likes">Liked</Link></li>
              <li><Link to="/cart">Cart</Link></li>
            </ul>
          </div>
          <div>
            <h4>Sell</h4>
            <ul>
              <li><Link to="/register">Become a seller</Link></li>
              <li><Link to="/retailer/products">Seller studio</Link></li>
            </ul>
          </div>
        </div>
        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} Flagzen</span>
          <span>Designed in 3D · Printed for real</span>
        </div>
      </div>
    </footer>
  );
}
