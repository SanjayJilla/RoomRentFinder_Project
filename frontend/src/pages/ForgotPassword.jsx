import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Key } from "lucide-react";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/forgot-password`,
        {
          email: email.trim(),
          role: role,
        }
      );

      setMessage(
        response.data.message ||
          "If an account with this email exists, a password reset link has been sent."
      );
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Unable to process request. Please try again."
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
          <Key size={24} />
        </div>

        <div className="owner-login-heading">
          <span>ACCOUNT RECOVERY</span>
          <h1>Forgot Password</h1>
          <p>Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        <form onSubmit={handleSubmit} className="owner-auth-card">
          {/* Account Role Selector */}
          <div className="owner-login-field">
            <label htmlFor="account-role">I am a</label>
            <select
              id="account-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "15px",
                backgroundColor: "#fff",
              }}
            >
              <option value="student">Student / Renter</option>
              <option value="owner">Property Owner</option>
            </select>
          </div>

          {/* Email */}
          <div className="owner-login-field">
            <label htmlFor="forgot-email">Registered Email Address</label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Feedback messages */}
          {error && (
            <p className="owner-login-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p
              style={{
                color: "#16a34a",
                backgroundColor: "#f0fdf4",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #bbf7d0",
                fontSize: "14px",
                margin: "12px 0",
              }}
              role="status"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            className="owner-login-submit"
            disabled={loading}
          >
            {loading ? "Sending link..." : "Send Reset Link"}
          </button>

          <p className="owner-login-register" style={{ marginTop: "16px" }}>
            Remembered your password?{" "}
            <Link to={role === "owner" ? "/login" : "/student/login"}>
              Back to Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;

