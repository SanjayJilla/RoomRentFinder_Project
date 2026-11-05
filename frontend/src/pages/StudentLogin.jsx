
import { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Building2, Eye, EyeOff } from "lucide-react";

function StudentLogin() {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("student_access_token")) {
      navigate("/student/dashboard", { replace: true });
    }
  }, [navigate]);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/students/login`,
        {
          email: form.email.trim(),
          password: form.password,
        }
      );

      // Remove previous owner session
      sessionStorage.removeItem("access_token");

      // Save student session
      sessionStorage.setItem(
        "student_access_token",
        response.data.access_token
      );

      sessionStorage.setItem(
        "student_name",
        response.data.student_name
      );

      // Update navbar
      window.dispatchEvent(new Event("auth-changed"));

      const redirectPath = sessionStorage.getItem("login_redirect");
      if (redirectPath) {
        sessionStorage.removeItem("login_redirect");
        navigate(redirectPath);
      } else {
        navigate("/student/dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-auth-container">
      <div className="student-login-wrapper">

        {/* Role Toggle */}
        <div style={{ textAlign: "center" }}>
          <div className="auth-role-switcher">
            <button
              type="button"
              className="auth-role-tab active"
              aria-current="page"
            >
              <GraduationCap size={15} /> Student
            </button>
            <Link to="/login" className="auth-role-tab">
              <Building2 size={15} /> Property Owner
            </Link>
          </div>
        </div>

        <div
          className="student-login-icon"
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
          <GraduationCap size={24} />
        </div>

        <div className="student-login-heading">
          <span>STUDENT PORTAL</span>
          <h1>Welcome back</h1>
          <p>
            Sign in to manage your saved rooms and enquiries.
          </p>
        </div>

        <form
          className="student-auth-card"
          onSubmit={handleSubmit}
        >
          <div className="student-login-field">
            <label htmlFor="student-login-email">
              Email Address
            </label>

            <input
              id="student-login-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="student-login-field">
            <label htmlFor="student-login-password">
              Password
            </label>

            <div className="student-password-wrapper">
              <input
                id="student-login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password: e.target.value,
                  })
                }
                required
                placeholder="Enter your password"
              />

              <button
                type="button"
                className="student-password-toggle"
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

          {error && (
            <p className="student-login-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="student-login-submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login to Your Account"}
          </button>

          <p className="student-login-register">
            Don't have an account?{" "}
            <Link to="/student/register">
              Create an account
            </Link>
          </p>
        </form>

        <Link to="/" className="student-login-back">
          ← Back to Home
        </Link>

      </div>
    </div>
  );
}

export default StudentLogin;
