import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  User,
  Mail,
  Phone,
  Key,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Building2,
} from "lucide-react";
import "../App.css";

const API_URL = `${import.meta.env.VITE_API_URL}`;

function getInitials(name) {
  if (!name) return "O";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function OwnerProfile() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    if (!token) { navigate("/login", { replace: true }); return; }

    let active = true;
    axios
      .get(`${API_URL}/owners/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!active) return;
        setForm({
          name: res.data.name || "",
          email: res.data.email || "",
          phone: res.data.phone || "",
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
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const token = sessionStorage.getItem("access_token");
    if (!token) { navigate("/login", { replace: true }); return; }
    setSaving(true);
    try {
      const res = await axios.patch(
        `${API_URL}/owners/me`,
        { name: form.name.trim(), phone: form.phone.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const u = res.data.owner;
      setForm({ name: u.name, email: u.email, phone: u.phone });
      setSuccess("Profile updated successfully!");
    } catch (err) {
      if ([401, 403].includes(err.response?.status)) {
        sessionStorage.removeItem("access_token");
        navigate("/login", { replace: true });
        return;
      }
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to update owner profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page-wrap">
        <div className="profile-loading">
          <Loader2 size={28} className="spin-icon" />
          <span>Loading profile…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-wrap">
      <div className="profile-container">

        {/* Back link */}
        <Link to="/owner/dashboard" className="profile-back-link">
          <ArrowLeft size={15} /> Back to Dashboard
        </Link>

        {/* Avatar card */}
        <div className="profile-hero-card">
          <div className="profile-avatar owner-avatar">
            {getInitials(form.name)}
          </div>
          <div className="profile-hero-info">
            <div className="profile-role-badge">
              <Building2 size={12} /> Property Owner
            </div>
            <h2 className="profile-hero-name">{form.name || "Owner"}</h2>
            <p className="profile-hero-email">{form.email}</p>
          </div>
        </div>

        {/* Edit form */}
        <form className="profile-form-card" onSubmit={handleSubmit}>
          <h3 className="profile-section-title">Edit Profile</h3>
          <p className="profile-section-sub">Update your name and phone number. Email is read-only.</p>

          {/* Alerts */}
          {error && (
            <div className="profile-alert profile-alert-error">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div className="profile-alert profile-alert-success">
              <CheckCircle2 size={16} /> {success}
            </div>
          )}

          {/* Name */}
          <div className="profile-field">
            <label htmlFor="owner-name">Full Name</label>
            <div className="profile-input-wrap">
              <User size={16} className="profile-input-icon" />
              <input
                id="owner-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                minLength={2}
                maxLength={100}
                placeholder="Your full name"
                required
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="profile-field">
            <label htmlFor="owner-email">
              Email Address
              <span className="profile-readonly-badge">Read-only</span>
            </label>
            <div className="profile-input-wrap is-readonly">
              <Mail size={16} className="profile-input-icon" />
              <input
                id="owner-email"
                type="email"
                value={form.email}
                readOnly
                tabIndex={-1}
              />
            </div>
            <p className="profile-field-hint">
              Email cannot be changed here. Contact admin to update it.
            </p>
          </div>

          {/* Phone */}
          <div className="profile-field">
            <label htmlFor="owner-phone">Phone Number</label>
            <div className="profile-input-wrap">
              <Phone size={16} className="profile-input-icon" />
              <input
                id="owner-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                minLength={10}
                maxLength={15}
                pattern="[0-9]{10,15}"
                placeholder="10-digit mobile number"
                required
              />
            </div>
          </div>

          <button type="submit" className="profile-save-btn" disabled={saving}>
            {saving ? (
              <><Loader2 size={16} className="spin-icon" /> Saving…</>
            ) : (
              <><Save size={16} /> Save Changes</>
            )}
          </button>
        </form>

        {/* Change password link */}
        <Link to="/owner/change-password" className="profile-change-pw-card">
          <div className="profile-change-pw-left">
            <div className="profile-change-pw-icon">
              <Key size={18} />
            </div>
            <div>
              <strong>Change Password</strong>
              <p>Update your account password for security</p>
            </div>
          </div>
          <ArrowLeft size={15} className="profile-arrow-right" />
        </Link>

      </div>
    </div>
  );
}

export default OwnerProfile;
