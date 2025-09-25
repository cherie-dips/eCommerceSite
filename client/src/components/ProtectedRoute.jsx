import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowRoles }) => {
  const { user, role } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (allowRoles && !allowRoles.includes(role)) return <Navigate to="/" />;
  return children;
};

export default ProtectedRoute;