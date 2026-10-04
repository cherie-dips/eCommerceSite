import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Sends logged-out visitors to the login page (and back here afterwards),
// and visitors without the right role to the home page.
const ProtectedRoute = ({ children, allowRoles }) => {
  const { user, role, loggedOut } = useAuth();
  const location = useLocation();
  if (!user && loggedOut) return <Navigate to="/" replace />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (allowRoles && !allowRoles.includes(role)) return <Navigate to="/" replace />;
  return children;
};

export default ProtectedRoute;
