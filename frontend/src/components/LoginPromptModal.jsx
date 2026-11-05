import { useNavigate } from "react-router-dom";
import { X, LogIn, GraduationCap, Building2, Shield } from "lucide-react";

/**
 * LoginPromptModal – shown when a guest tries to access a protected action.
 * Props:
 *   onClose()  – called when user dismisses without logging in
 *   targetPath – optional path to redirect to after login (future use)
 */
function LoginPromptModal({ onClose, targetPath }) {
  const navigate = useNavigate();

  const goLogin = (path) => {
    onClose();
    // Stash where the user was trying to go so post-login we can redirect back
    if (targetPath) sessionStorage.setItem("login_redirect", targetPath);
    navigate(path);
  };

  return (
    <div
      className="lpm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lpm-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="lpm-card">
        {/* Close button */}
        <button
          type="button"
          className="lpm-close"
          onClick={onClose}
          aria-label="Close login prompt"
        >
          <X size={18} />
        </button>

        {/* Icon + heading */}
        <div className="lpm-icon-wrap">
          <Shield size={32} strokeWidth={1.5} className="lpm-shield" />
        </div>
        <h2 id="lpm-title" className="lpm-title">Login Required</h2>
        <p className="lpm-desc">
          Sign in to view full property details, contact owners, save rooms, and
          send enquiries.
        </p>

        {/* CTA buttons */}
        <div className="lpm-actions">
          <button
            type="button"
            className="lpm-btn lpm-btn-student"
            onClick={() => goLogin("/student/login")}
          >
            <GraduationCap size={17} />
            Student Login
          </button>
          <button
            type="button"
            className="lpm-btn lpm-btn-owner"
            onClick={() => goLogin("/login")}
          >
            <Building2 size={17} />
            Owner Login
          </button>
        </div>

        <p className="lpm-register-hint">
          No account?{" "}
          <button
            type="button"
            className="lpm-link"
            onClick={() => goLogin("/student/register")}
          >
            Register as Student
          </button>{" "}
          or{" "}
          <button
            type="button"
            className="lpm-link"
            onClick={() => goLogin("/register")}
          >
            Register as Owner
          </button>
        </p>
      </div>
    </div>
  );
}

export default LoginPromptModal;

