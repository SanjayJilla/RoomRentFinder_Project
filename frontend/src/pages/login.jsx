
import { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Building2, User, Eye, EyeOff } from "lucide-react";

function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("access_token")) {
      navigate("/owner/dashboard", { replace: true });
    }
  }, [navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/owners/login`,
        {
          email: email.trim(),
          password,
        }
      );

      // Remove previous student session
      sessionStorage.removeItem("student_access_token");
      sessionStorage.removeItem("student_name");

      // Save owner session
      sessionStorage.setItem(
        "access_token",
        response.data.access_token
      );

      // Update navbar immediately
      window.dispatchEvent(new Event("auth-changed"));

      const redirectPath = sessionStorage.getItem("login_redirect");
      if (redirectPath) {
        sessionStorage.removeItem("login_redirect");
        navigate(redirectPath);
      } else {
        navigate("/owner/dashboard");
      }
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="owner-auth-container">
      <div className="owner-login-wrapper">

        {/* Role Toggle */}
        <div style={{ textAlign: "center" }}>
          <div className="auth-role-switcher">
            <Link to="/student/login" className="auth-role-tab">
              <User size={15} /> User
            </Link>
            <button
              type="button"
              className="auth-role-tab active"
              aria-current="page"
            >
              <Building2 size={15} /> Property Owner
            </button>
          </div>
        </div>

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
          <Building2 size={24} />
        </div>

        <div className="owner-login-heading">
          <span>PROPERTY OWNER PORTAL</span>

          <h1>Welcome back</h1>

          <p>
            Sign in to manage your rental properties,
            photos, and availability.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="owner-auth-card"
        >
          {/* Email */}
          <div className="owner-login-field">
            <label htmlFor="owner-login-email">
              Email Address
            </label>

            <input
              id="owner-login-email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="owner-login-field">
            <label htmlFor="owner-login-password">
              Password
            </label>

            <div className="owner-password-wrapper">
              <input
                id="owner-login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="owner-password-toggle"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                aria-pressed={showPassword}
                style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showPassword ? "Hide" : "Show"}</span>
              </button>
            </div>
          </div>

          <div style={{ textAlign: "right", marginTop: "-6px", marginBottom: "14px" }}>
            <Link
              to="/forgot-password"
              style={{ fontSize: "13px", color: "#2563eb", textDecoration: "none" }}
            >
              Forgot password?
            </Link>
          </div>

          {/* Error */}
          {error && (
            <p className="owner-login-error" role="alert">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="owner-login-submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login to Your Account"}
          </button>

          <p className="owner-login-register">
            New property owner?{" "}
            <Link to="/register">
              Create an account
            </Link>
          </p>
        </form>

        <Link to="/" className="owner-login-back">
          ← Back to Home
        </Link>

      </div>
    </div>
  );
}

export default Login;
