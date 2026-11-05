
import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Building2, Eye, EyeOff } from "lucide-react";
import { validatePassword, suggestEmailCorrection } from "../utils/validation";

function StudentRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

  const handleSubmit = async (e) => {
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
        `${import.meta.env.VITE_API_URL}/students/register`,
        form
      );

      alert("Registration successful! Please login.");
      navigate("/student/login");
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail) && detail[0]?.msg
          ? detail[0].msg
          : "Registration failed. Please try again."
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
            <Link to="/register" className="auth-role-tab">
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
          <h1>Create your account</h1>
          <p>
            Join RoomRentFinder to discover rooms, save your
            favorites, and contact property owners.
          </p>
        </div>

        <form
          className="student-auth-card student-register-card"
          onSubmit={handleSubmit}
        >
          {/* Full name */}
          <div className="student-login-field">
            <label htmlFor="student-register-name">
              Full Name
            </label>

            <input
              id="student-register-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              placeholder="Enter your full name"
            />
          </div>

          {/* Email */}
          <div className="student-login-field">
            <label htmlFor="student-register-email">
              Email Address
            </label>

            <input
              id="student-register-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              placeholder="Enter your email"
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
          <div className="student-login-field">
            <label htmlFor="student-register-phone">
              Phone Number
            </label>

            <input
              id="student-register-phone"
              type="tel"
              name="phone"
              inputMode="numeric"
              value={form.phone}
              onChange={handleChange}
              required
              pattern="[0-9]{10}"
              maxLength={10}
              autoComplete="tel-national"
              title="Enter a 10-digit mobile number"
              placeholder="10-digit mobile number"
            />
          </div>

          {/* Password */}
          <div className="student-login-field">
            <label htmlFor="student-register-password">
              Password
            </label>

            <div className="student-password-wrapper">
              <input
                id="student-register-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
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

            <small className="student-register-hint">
              Use at least 8 characters for your password.
            </small>
          </div>

          {/* Error */}
          {error && (
            <p className="student-login-error" role="alert">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="student-login-submit"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <p className="student-login-register">
            Already have an account?{" "}
            <Link to="/student/login">Login here</Link>
          </p>
        </form>

        <Link to="/" className="student-login-back">
          ← Back to Home
        </Link>

      </div>
    </div>
  );
}

export default StudentRegister;
