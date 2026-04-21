import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

/**
 * Custom hook to access authentication state and actions.
 *
 * Returns:
 *   - user          : { id, name, email, role, phone } | null
 *   - token         : JWT string | null
 *   - isAuthenticated: boolean
 *   - isLoading     : boolean (initial session restoration)
 *   - login(userData, token) : persist session
 *   - logout()      : clear session
 *   - hasRole(...roles): boolean — true if user.role is in the list
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }

  /**
   * Check if the current user has one of the allowed roles.
   * @param {...string} roles
   */
  const hasRole = (...roles) => {
    if (!context.user) return false;
    return roles.includes(context.user.role);
  };

  /**
   * True if the user is a student or staff (can upload/pay/track)
   */
  const isStudent = hasRole("student", "staff");

  /**
   * True if the user can see the print shop dashboard
   */
  const isPrintshop = hasRole("printshop", "admin");

  /**
   * True if the user is an admin
   */
  const isAdmin = hasRole("admin");

  return {
    ...context,
    hasRole,
    isStudent,
    isPrintshop,
    isAdmin,
  };
};
