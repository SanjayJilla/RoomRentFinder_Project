import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { validatePassword } from "../utils/validation";

function StudentChangePassword() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const passwordError = validatePassword(form.new_password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (form.new_password !== form.confirm_password) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (form.current_password === form.new_password) {
      setError("New password must be different from current password.");
      return;
    }

    const token = sessionStorage.getItem("student_access_token");

    if (!token) {
      navigate("/student/login", { replace: true });
      return;
    }

    setLoading(true);

    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/students/me/password`,
        {
          current_password: form.current_password,
          new_password: form.new_password,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess("Password changed successfully!");

      setForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      if ([401, 403].includes(err.response?.status)) {
        sessionStorage.removeItem("student_access_token");
        sessionStorage.removeItem("student_name");
        navigate("/student/login", { replace: true });
        return;
      }

      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to change password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-auth-container">
      <form className="student-auth-card" onSubmit={handleSubmit}>
        <h2>Change Password</h2>
        <p>Update your account password securely.</p>

        <label htmlFor="current-password">Current Password</label>
        <input
          id="current-password"
          type={showPassword ? "text" : "password"}
          name="current_password"
          value={form.current_password}
          onChange={handleChange}
          autoComplete="current-password"
          required
        />

        <label htmlFor="new-password">New Password</label>
        <input
          id="new-password"
          type={showPassword ? "text" : "password"}
          name="new_password"
          value={form.new_password}
          onChange={handleChange}
          autoComplete="new-password"
          minLength={8}
          required
        />

        <label htmlFor="confirm-password">Confirm New Password</label>
        <input
          id="confirm-password"
          type={showPassword ? "text" : "password"}
          name="confirm_password"
          value={form.confirm_password}
          onChange={handleChange}
          autoComplete="new-password"
          minLength={8}
          required
        />

        <label className="show-password-label">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
          />
          Show passwords
        </label>

        {error && <p className="error">{error}</p>}
        {success && <p className="profile-success">{success}</p>}

        <button
          type="submit"
          className="primary-btn"
          disabled={loading}
        >
          {loading ? "Updating Password..." : "Update Password"}
        </button>

        <p>
          <Link to="/student/profile">
            ← Back to My Profile
          </Link>
        </p>
      </form>
    </div>
  );
}

export default StudentChangePassword;
