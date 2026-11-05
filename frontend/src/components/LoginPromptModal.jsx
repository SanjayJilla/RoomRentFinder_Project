import { useNavigate } from "react-router-dom";
import { X, GraduationCap, Building2, Shield, Info } from "lucide-react";

/**
 * LoginPromptModal – handles both guest login prompts and role-switching notices.
 * Props:
 *   onClose()    – called when user dismisses without logging in
 *   targetPath   – optional path to redirect to after login
 *   roleNotice   – optional { title, message, targetRole } for role conflicts
 */
function LoginPromptModal({ onClose, targetPath, roleNotice = null }) {
  const navigate = useNavigate();

  const goLogin = (path) => {
    onClose();
    if (targetPath) sessionStorage.setItem("login_redirect", targetPath);
    navigate(path);
  };

  // If this is a role-conflict notice (e.g. an Owner trying a student-only feature)
  if (roleNotice) {
    return (
      <div
        className="lpm-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lpm-title"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="lpm-card">
          <button
            type="button"
            className="lpm-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="lpm-icon-wrap" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
            <Info size={32} strokeWidth={1.8} style={{ color: "#d97706" }} />
          </div>

          <h2 id="lpm-title" className="lpm-title">
            {roleNotice.title || "Student Account Required"}
          </h2>
          <p className="lpm-desc">
            {roleNotice.message ||
              "You are currently logged in as a Property Owner. This feature is designed for student renters."}
          </p>

          <div className="lpm-actions">
            <button
              type="button"
              className="lpm-btn lpm-btn-student"
              onClick={() => {
                sessionStorage.removeItem("access_token");
                goLogin("/student/login");
              }}
            >
              <GraduationCap size={17} />
              Switch to Student Account
            </button>
            <button
              type="button"
              className="lpm-btn lpm-btn-owner"
              onClick={onClose}
            >
              Continue as Owner
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standard guest login prompt
  return (
    <div
      className="lpm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lpm-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="lpm-card">
        <button
          type="button"
          className="lpm-close"
          onClick={onClose}
          aria-label="Close login prompt"
        >
          <X size={18} />
        </button>

        <div className="lpm-icon-wrap">
          <Shield size={32} strokeWidth={1.5} className="lpm-shield" />
        </div>
        <h2 id="lpm-title" className="lpm-title">Login Required</h2>
        <p className="lpm-desc">
          Sign in to view full property details, contact owners, save rooms, and
          send enquiries.
        </p>

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
