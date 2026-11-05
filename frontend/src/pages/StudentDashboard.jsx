import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Heart,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { getFavorites } from "../services/favoritesApi";

function StudentDashboard() {
  const navigate = useNavigate();

  const studentName =
    sessionStorage.getItem("student_name") || "Student";

  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedRoomsCount, setSavedRoomsCount] = useState(0);
  const [favoritesError, setFavoritesError] = useState("");

  // Load student enquiries
  useEffect(() => {
    const token = sessionStorage.getItem("student_access_token");

    if (!token) {
      navigate("/student/login", { replace: true });
      return;
    }

    let active = true;

    axios
      .get(`${import.meta.env.VITE_API_URL}/students/me/enquiries`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        if (active) {
          setEnquiries(
            Array.isArray(response.data) ? response.data : []
          );
        }
      })
      .catch((err) => {
        if (!active) return;

        if (
          err.response?.status === 401 ||
          err.response?.status === 403
        ) {
          sessionStorage.removeItem("student_access_token");
          sessionStorage.removeItem("student_name");
          navigate("/student/login", { replace: true });
        } else {
          setError("Unable to load your enquiries.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  // Load saved rooms count
  useEffect(() => {
    const token = sessionStorage.getItem("student_access_token");

    if (!token) return;

    let active = true;

    getFavorites()
      .then((data) => {
        if (active) {
          setSavedRoomsCount(
            Array.isArray(data) ? data.length : 0
          );
        }
      })
      .catch(() => {
        if (active) {
          setFavoritesError(
            "Unable to load saved rooms count."
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Dashboard statistics
  const totalEnquiries = enquiries.length;

  const pendingEnquiries = enquiries.filter(
    (enquiry) =>
      (enquiry.status || "Pending").toLowerCase() === "pending"
  ).length;

  // Enquiry status styling & icon
  const getEnquiryStatus = (status) => {
    const value = (status || "Pending").toLowerCase();

    const allowed = [
      "pending",
      "contacted",
      "closed",
      "accepted",
      "rejected",
    ];

    const normalized = allowed.includes(value) ? value : "pending";

    let icon = <Clock size={12} style={{ marginRight: "4px" }} />;
    if (normalized === "accepted" || normalized === "closed") {
      icon = <CheckCircle2 size={12} style={{ marginRight: "4px" }} />;
    } else if (normalized === "rejected") {
      icon = <XCircle size={12} style={{ marginRight: "4px" }} />;
    }

    return {
      label: normalized.charAt(0).toUpperCase() + normalized.slice(1),
      className: normalized,
      icon,
    };
  };

  return (
    <div className="student-dashboard-page">
      <div className="student-dashboard-container">
        {/* Welcome section */}
        <div className="student-dashboard-header">
          <div>
            <span className="student-dashboard-kicker">STUDENT WORKSPACE</span>
            <h1>Welcome, {studentName}!</h1>
            <p>
              Manage your room search, saved properties, and enquiries in one place.
            </p>
          </div>

          <Link to="/" className="student-explore-btn">
            Explore Rooms <ArrowRight size={15} style={{ marginLeft: "6px" }} />
          </Link>
        </div>

        {/* Dashboard statistics */}
        <div className="student-stats-grid">
          <div className="student-stat-card">
            <div
              className="student-stat-icon"
              style={{ backgroundColor: "#fff1f2", color: "#e11d48" }}
            >
              <Heart size={20} />
            </div>
            <span>Saved Rooms</span>
            <strong>{savedRoomsCount}</strong>
            <Link to="/favorites">
              View Saved Rooms <ArrowRight size={12} style={{ display: "inline", verticalAlign: "middle" }} />
            </Link>
          </div>

          <div className="student-stat-card">
            <div
              className="student-stat-icon"
              style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}
            >
              <Send size={18} />
            </div>
            <span>Total Enquiries</span>
            <strong>{totalEnquiries}</strong>
            <p>Enquiries you have submitted</p>
          </div>

          <div className="student-stat-card">
            <div
              className="student-stat-icon"
              style={{ backgroundColor: "#fef3c7", color: "#d97706" }}
            >
              <Clock size={20} />
            </div>
            <span>Pending Enquiries</span>
            <strong>{pendingEnquiries}</strong>
            <p>Awaiting owner response</p>
          </div>
        </div>

        {favoritesError && <p className="error">{favoritesError}</p>}

        {/* Enquiry history */}
        <section className="student-enquiries-section">
          <div className="student-enquiries-title">
            <div>
              <h2>My Enquiries</h2>
              <p>Track your enquiries and owner responses.</p>
            </div>

            <span className="student-enquiries-count">
              {totalEnquiries} {totalEnquiries === 1 ? "Enquiry" : "Enquiries"}
            </span>
          </div>

          {loading ? (
            <div className="student-enquiries-empty">
              Loading your enquiries...
            </div>
          ) : error ? (
            <div className="student-enquiries-empty error">{error}</div>
          ) : enquiries.length === 0 ? (
            <div className="student-enquiries-empty">
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "56px",
                  height: "56px",
                  borderRadius: "14px",
                  backgroundColor: "#f1f5f9",
                  color: "#64748b",
                  marginBottom: "16px",
                }}
              >
                <Inbox size={28} />
              </div>

              <h3>No enquiries yet</h3>

              <p>
                You haven't contacted any property owners yet. Explore available
                rooms and send your first enquiry.
              </p>

              <Link to="/" className="student-explore-btn">
                Explore Available Rooms <ArrowRight size={14} style={{ marginLeft: "6px" }} />
              </Link>
            </div>
          ) : (
            <div className="student-enquiries-list">
              {enquiries.map((enquiry) => {
                const status = getEnquiryStatus(enquiry.status);

                return (
                  <article className="student-enquiry-card" key={enquiry.id}>
                    <div className="student-enquiry-heading">
                      <h3>{enquiry.room_title || "Room"}</h3>

                      <span className={`student-status ${status.className}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>

                    <p
                      className="student-enquiry-location"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        margin: "4px 0 16px",
                      }}
                    >
                      <MapPin size={13} style={{ color: "#64748b", flexShrink: 0 }} />
                      <span>{enquiry.location || "Location unavailable"}</span>
                    </p>

                    <div className="student-enquiry-details">
                      <div>
                        <span>Monthly Rent</span>
                        <strong>
                          {enquiry.rent != null
                            ? `₹${Number(enquiry.rent).toLocaleString("en-IN")}`
                            : "Not available"}
                        </strong>
                      </div>

                      <div>
                        <span>Enquiry Status</span>
                        <strong>{status.label}</strong>
                      </div>
                    </div>

                    <div className="student-enquiry-message">
                      <span>Your Message</span>
                      <p>{enquiry.message}</p>
                    </div>

                    <Link
                      to={`/rooms/${enquiry.room_id}`}
                      className="student-view-property"
                    >
                      View Property <ArrowRight size={13} style={{ display: "inline", verticalAlign: "middle" }} />
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default StudentDashboard;
