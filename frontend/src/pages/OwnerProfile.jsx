
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL}`;

function OwnerProfile() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    let active = true;

    axios
      .get(`${API_URL}/owners/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        if (!active) return;

        setForm({
          name: response.data.name || "",
          email: response.data.email || "",
          phone: response.data.phone || "",
        });
      })
      .catch((err) => {
        if (!active) return;

        if ([401, 403].includes(err.response?.status)) {
          sessionStorage.removeItem("access_token");
          navigate("/login", { replace: true });
        } else {
          setError("Unable to load owner profile.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const token = sessionStorage.getItem("access_token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setSaving(true);

    try {
      const response = await axios.patch(
        `${API_URL}/owners/me`,
        {
          name: form.name.trim(),
          phone: form.phone.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedOwner = response.data.owner;

      setForm({
        name: updatedOwner.name,
        email: updatedOwner.email,
        phone: updatedOwner.phone,
      });

      setSuccess("Profile updated successfully!");
    } catch (err) {
      if ([401, 403].includes(err.response?.status)) {
        sessionStorage.removeItem("access_token");
        navigate("/login", { replace: true });
        return;
      }

      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to update owner profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="container">Loading owner profile...</p>;
  }

  return (
    <div className="student-auth-container">
      <form
        className="student-auth-card"
        onSubmit={handleSubmit}
      >
        <h2>Owner Profile</h2>
        <p>Manage your contact information.</p>

        <label htmlFor="owner-name">Full Name</label>
        <input
          id="owner-name"
          type="text"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
          minLength={2}
          maxLength={100}
          required
        />

        <label htmlFor="owner-email">Email Address</label>
        <input
          id="owner-email"
          type="email"
          value={form.email}
          readOnly
        />

        <label htmlFor="owner-phone">Phone Number</label>
        <input
          id="owner-phone"
          type="tel"
          value={form.phone}
          onChange={(e) =>
            setForm({ ...form, phone: e.target.value })
          }
          minLength={10}
          maxLength={15}
          pattern="[0-9]{10,15}"
          required
        />

        {error && <p className="error">{error}</p>}

        {success && (
          <p className="profile-success">{success}</p>
        )}

        <button
          type="submit"
          className="primary-btn"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>

        <Link
          to="/owner/change-password"
          className="change-password-link"
        >
          Change Password
        </Link>

        <p>
          <Link to="/owner/dashboard">
            ← Back to Owner Dashboard
          </Link>
        </p>
      </form>
    </div>
  );
}

export default OwnerProfile;
