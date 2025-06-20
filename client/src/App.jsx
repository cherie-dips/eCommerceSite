import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Products from "./pages/Product";
import ProductDetails from "./pages/ProductDetails";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute"; 
import { AuthProvider } from "./context/AuthContext";
import Register from "./pages/Register";
import { CartProvider, useCart } from "./context/CartContext";
import CartModal from "./components/CartModal";
import { LikesProvider } from "./context/LikesContext";
import LikedProducts from "./pages/LikedProducts";

function AppContent() {
  const { showCart } = useCart(); // ✅ useCart is now safely used inside CartProvider

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/likes" element={<LikedProducts />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <div>Admin Panel (TODO)</div>
            </ProtectedRoute>
          }
        />
      </Routes>
      {showCart && <CartModal />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <LikesProvider>
        <CartProvider>
          <Router>
            <AppContent /> {/* ✅ context is now safe here */}
          </Router>
        </CartProvider>
      </LikesProvider>
    </AuthProvider>
  );
}

export default App;