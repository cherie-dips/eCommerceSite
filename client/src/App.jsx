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
import { LikesProvider } from "./context/LikesContext";
import LikedProducts from "./pages/LikedProducts";
import CartPage from "./pages/CartPage";
import Checkout from "./pages/Checkout";
import RetailerProducts from "./pages/RetailerProducts";
import RetailerOrders from "./pages/RetailerOrders";
import UploadProduct from "./pages/UploadProduct";

function AppContent() {

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
        <Route path="/cart" element={<CartPage />} /> 
        <Route path="/checkout" element={<Checkout />} />
        <Route
          path="/retailer/products"
          element={
            <ProtectedRoute allowRoles={["retailer"]}>
              <RetailerProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/orders"
          element={
            <ProtectedRoute allowRoles={["retailer"]}>
              <RetailerOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/upload"
          element={
            <ProtectedRoute allowRoles={["retailer"]}>
              <UploadProduct />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <div>Admin Panel (TODO)</div>
            </ProtectedRoute>
          }
        />
      </Routes>

    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <LikesProvider>
        <CartProvider>
          <Router>
            <AppContent />
          </Router>
        </CartProvider>
      </LikesProvider>
    </AuthProvider>
  );
}

export default App;