
import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { validatePassword } from "../utils/validation";

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

        <div className="student-login-icon">🎓</div>

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
              >
                {showPassword ? "Hide" : "Show"}
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
