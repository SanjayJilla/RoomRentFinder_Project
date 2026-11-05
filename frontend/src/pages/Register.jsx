
import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Building2, User, Eye, EyeOff } from "lucide-react";
import { validatePassword, suggestEmailCorrection } from "../utils/validation";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        name === "phone"
          ? value.replace(/\D/g, "").slice(0, 10)
          : value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    const passwordError = validatePassword(form.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/owners/register`,
        form
      );

      alert("Registration successful! Please log in.");
      navigate("/login");
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail) && detail[0]?.msg
          ? detail[0].msg
          : "Registration failed. Please check your details."
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
            <Link to="/student/register" className="auth-role-tab">
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

          <h1>Create your account</h1>

          <p>
            Join RoomRentFinder to list your properties,
            manage availability, and connect with tenants.
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          className="owner-auth-card owner-register-card"
        >

          {/* Full Name */}
          <div className="owner-login-field">
            <label htmlFor="owner-register-name">
              Full Name
            </label>

            <input
              id="owner-register-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              required
            />
          </div>

          {/* Email */}
          <div className="owner-login-field">
            <label htmlFor="owner-register-email">
              Email Address
            </label>

            <input
              id="owner-register-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="email"
              required
            />

            {suggestEmailCorrection(form.email) && (
              <div
                style={{
                  marginTop: "6px",
                  fontSize: "12px",
                  color: "#1d4ed8",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <span>
                  Did you mean <strong>{suggestEmailCorrection(form.email)}</strong>?
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      email: suggestEmailCorrection(prev.email),
                    }))
                  }
                  style={{
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Apply Fix
                </button>
              </div>
            )}
          </div>

          {/* Phone */}
          <div className="owner-login-field">
            <label htmlFor="owner-register-phone">
              Phone Number
            </label>

            <input
              id="owner-register-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={handleChange}
              placeholder="10-digit mobile number"
              pattern="[0-9]{10}"
              maxLength={10}
              title="Enter a 10-digit mobile number"
              autoComplete="tel-national"
              required
            />
          </div>

          {/* Password */}
          <div className="owner-login-field">
            <label htmlFor="owner-register-password">
              Password
            </label>

            <div className="owner-password-wrapper">
              <input
                id="owner-register-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                minLength={8}
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

            <small className="owner-register-hint">
              Use at least 8 characters for your password.
            </small>
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
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <p className="owner-login-register">
            Already have an account?{" "}
            <Link to="/login">Login here</Link>
          </p>
        </form>

        <Link to="/" className="owner-login-back">
          ← Back to Home
        </Link>

      </div>
    </div>
  );
}

export default Register;
