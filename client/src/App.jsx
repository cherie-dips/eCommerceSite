import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { LikesProvider } from "./context/LikesContext";
import { ToastProvider } from "./context/ToastContext";
import "./styles/ui.css";

// Pages are loaded only when opened, so the first visit stays fast
// (the 3D and design-editor code is large).
const Products = lazy(() => import("./pages/Product"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const LikedProducts = lazy(() => import("./pages/LikedProducts"));
const CartPage = lazy(() => import("./pages/CartPage"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Orders = lazy(() => import("./pages/Orders"));
const MyDesigns = lazy(() => import("./pages/MyDesigns"));
const Profile = lazy(() => import("./pages/Profile"));
const RetailerProducts = lazy(() => import("./pages/RetailerProducts"));
const RetailerOrders = lazy(() => import("./pages/RetailerOrders"));
const ProductForm = lazy(() => import("./pages/ProductForm"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const CustomizationPage = lazy(() => import("./pages/CustomizationPage"));
const CustomizationPage3D = lazy(() => import("./pages/3dCustomizationPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component for session restoration
const LoadingSpinner = ({ message = "Restoring your session..." }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    flexDirection: 'column',
    backgroundColor: '#f8f9fa'
  }}>
    <div className="spinner" />
    <p style={{ marginTop: '0', color: '#666' }}>{message}</p>
  </div>
);

const SELLER_ROLES = ["retailer", "admin"];

function AppContent() {
  const { isLoading } = useAuth();

  // Show loading spinner while restoring session
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Navbar />
      <Suspense fallback={<LoadingSpinner message="Loading..." />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/customize" element={<CustomizationPage />} />
          <Route path="/customize-3d" element={<CustomizationPage3D />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/likes" element={<LikedProducts />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/designs" element={<ProtectedRoute><MyDesigns /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="/retailer" element={<Navigate to="/retailer/products" replace />} />
          <Route
            path="/retailer/products"
            element={<ProtectedRoute allowRoles={SELLER_ROLES}><RetailerProducts /></ProtectedRoute>}
          />
          <Route
            path="/retailer/products/new"
            element={<ProtectedRoute allowRoles={SELLER_ROLES}><ProductForm /></ProtectedRoute>}
          />
          <Route
            path="/retailer/products/:id/edit"
            element={<ProtectedRoute allowRoles={SELLER_ROLES}><ProductForm /></ProtectedRoute>}
          />
          <Route path="/retailer/upload" element={<Navigate to="/retailer/products/new" replace />} />
          <Route
            path="/retailer/orders"
            element={<ProtectedRoute allowRoles={SELLER_ROLES}><RetailerOrders /></ProtectedRoute>}
          />
          <Route
            path="/admin"
            element={<ProtectedRoute allowRoles={["admin"]}><AdminPanel /></ProtectedRoute>}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <LikesProvider>
          <CartProvider>
            <Router>
              <AppContent />
            </Router>
          </CartProvider>
        </LikesProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
