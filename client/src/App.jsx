import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Products from "./pages/Product";
import ProductDetails from "./pages/ProductDetails";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute"; 
import { AuthProvider, useAuth } from "./context/AuthContext";
import Register from "./pages/Register";
import { CartProvider, useCart } from "./context/CartContext";
import { LikesProvider } from "./context/LikesContext";
import LikedProducts from "./pages/LikedProducts";
import CartPage from "./pages/CartPage";
import Checkout from "./pages/Checkout";
import RetailerProducts from "./pages/RetailerProducts";
import RetailerOrders from "./pages/RetailerOrders";
import UploadProduct from "./pages/UploadProduct";

// Loading component for session restoration
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    flexDirection: 'column',
    backgroundColor: '#f8f9fa'
  }}>
    <div style={{
      width: '50px',
      height: '50px',
      border: '4px solid #e3f2fd',
      borderTop: '4px solid #2196f3',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <p style={{ marginTop: '20px', color: '#666' }}>Restoring your session...</p>
    <style jsx>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

function AppContent() {
  const { isLoading } = useAuth();

  // Show loading spinner while restoring session
  if (isLoading) {
    return <LoadingSpinner />;
  }

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