import { useState } from "react";
import axios from "axios";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { validatePassword } from "../utils/validation";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is missing from the link. Please request a new link.");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/reset-password`,
        {
          token,
          new_password: newPassword,
        }
      );

      setSuccess(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Unable to reset password. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="owner-auth-container">
      <div className="owner-login-wrapper">
        <div
          className="owner-login-icon"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            backgroundColor: "#eff6ff",
            color: "#2563eb",
            margin: "0 auto 14px",
          }}
        >
          <Lock size={24} />
        </div>

        <div className="owner-login-heading">
          <span>PASSWORD RESET</span>
          <h1>Set New Password</h1>
          <p>Please enter and confirm your new secure password.</p>
        </div>

        {success ? (
          <div
            className="owner-auth-card"
            style={{ textAlign: "center", padding: "30px 20px" }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#dcfce7",
                color: "#16a34a",
                margin: "0 auto 15px",
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontSize: "20px", color: "#16a34a", marginBottom: "10px" }}>
              Password Reset Successful!
            </h2>
            <p style={{ color: "#475569", marginBottom: "25px", fontSize: "15px" }}>
              Your password has been securely updated. You can now log in with your new password.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="owner-login-submit"
              style={{ width: "100%" }}
            >
              Go to Owner Login
            </button>
            <button
              onClick={() => navigate("/student/login")}
              className="owner-login-submit"
              style={{
                width: "100%",
                marginTop: "10px",
                backgroundColor: "#2563eb",
              }}
            >
              Go to Student Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="owner-auth-card">
            {!token && (
              <p className="owner-login-error" role="alert">
                Warning: No reset token detected in the URL. Please ensure you clicked the full link from your email.
              </p>
            )}

            {/* New Password */}
            <div className="owner-login-field">
              <label htmlFor="reset-new-password">New Password</label>
              <div className="owner-password-wrapper">
                <input
                  id="reset-new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min 8 characters, uppercase, digit, symbol"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="owner-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="owner-login-field">
              <label htmlFor="reset-confirm-password">Confirm New Password</label>
              <div className="owner-password-wrapper">
                <input
                  id="reset-confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </div>

            {/* Error feedback */}
            {error && (
              <p className="owner-login-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="owner-login-submit"
              disabled={loading || !token}
            >
              {loading ? "Updating Password..." : "Update Password"}
            </button>

            <p className="owner-login-register" style={{ marginTop: "16px" }}>
              Remember your password? <Link to="/login">Back to Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;

