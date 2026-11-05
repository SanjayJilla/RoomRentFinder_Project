import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Phone,
  PhoneCall,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Inbox,
  Loader2,
  AlertCircle,
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_API_URL}`;

function OwnerEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // "all" | "pending" | "accepted" | "rejected"

  // Status updates
  const [updatingId, setUpdatingId] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [updateError, setUpdateError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    axios
      .get(`${API_URL}/owners/me/enquiries`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        setEnquiries(Array.isArray(response.data) ? response.data : []);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          sessionStorage.removeItem("access_token");
          navigate("/login", { replace: true });
        } else {
          setError("Unable to load student inquiries.");
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleStatusChange = async (enquiryId, newStatus) => {
    const token = sessionStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    setUpdatingId(enquiryId);
    setUpdateError("");
    setUpdateSuccess("");

    try {
      await axios.patch(
        `${API_URL}/owners/enquiries/${enquiryId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setEnquiries((prev) =>
        prev.map((item) =>
          item.id === enquiryId ? { ...item, status: newStatus } : item
        )
      );
      setUpdateSuccess(`Inquiry #${enquiryId} updated to ${newStatus}.`);
      setTimeout(() => setUpdateSuccess(""), 3000);
    } catch (err) {
      setUpdateError(
        err.response?.data?.detail || "Unable to update inquiry status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const getCleanPhone = (phone) => {
    if (!phone) return "";
    return phone.replace(/[^0-9]/g, "");
  };

  // Filtered inquiries
  const filteredEnquiries = enquiries.filter((item) => {
    if (filterTab === "all") return true;
    return item.status?.toLowerCase() === filterTab;
  });

  const pendingCount = enquiries.filter(
    (e) => e.status?.toLowerCase() === "pending"
  ).length;
  const acceptedCount = enquiries.filter(
    (e) => e.status?.toLowerCase() === "accepted"
  ).length;
  const rejectedCount = enquiries.filter(
    (e) => e.status?.toLowerCase() === "rejected"
  ).length;

  if (loading) {
    return (
      <div className="enquiries-page">
        <div className="enquiries-container">
          <div className="enquiries-loading">
            <Loader2 size={24} className="spin-icon" />
            <p>Loading student inquiries...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="enquiries-page">
      <div className="enquiries-container">
        {/* Breadcrumb */}
        <Link to="/owner/dashboard" className="enquiries-back">
          <ArrowLeft size={15} /> Back to Dashboard
        </Link>

        {/* Page Header */}
        <div className="enquiries-header">
          <div>
            <span className="enquiries-kicker">STUDENT INQUIRIES & LEADS</span>
            <h1>Property Inquiries</h1>
            <p>Review messages from students interested in your listings and follow up quickly.</p>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="enquiries-alert is-error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {updateError && (
          <div className="enquiries-alert is-error" role="alert">
            <AlertCircle size={16} />
            <span>{updateError}</span>
          </div>
        )}

        {updateSuccess && (
          <div className="enquiries-alert is-success" role="status">
            <CheckCircle2 size={16} />
            <span>{updateSuccess}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="enquiries-tabs" role="tablist">
          <button
            type="button"
            className={`enquiries-tab ${filterTab === "all" ? "is-active" : ""}`}
            onClick={() => setFilterTab("all")}
          >
            All Inquiries
            <span className="tab-count">{enquiries.length}</span>
          </button>
          <button
            type="button"
            className={`enquiries-tab ${filterTab === "pending" ? "is-active" : ""}`}
            onClick={() => setFilterTab("pending")}
          >
            Pending
            <span className="tab-count is-amber">{pendingCount}</span>
          </button>
          <button
            type="button"
            className={`enquiries-tab ${filterTab === "accepted" ? "is-active" : ""}`}
            onClick={() => setFilterTab("accepted")}
          >
            Accepted
            <span className="tab-count is-green">{acceptedCount}</span>
          </button>
          <button
            type="button"
            className={`enquiries-tab ${filterTab === "rejected" ? "is-active" : ""}`}
            onClick={() => setFilterTab("rejected")}
          >
            Rejected
            <span className="tab-count is-rose">{rejectedCount}</span>
          </button>
        </div>

        {/* Inquiries List */}
        {filteredEnquiries.length === 0 ? (
          <div className="enquiries-empty-state">
            <div className="enquiries-empty-icon">
              <Inbox size={32} />
            </div>
            <h3>No inquiries found</h3>
            <p>
              {filterTab === "all"
                ? "You haven't received any student inquiries yet. When students contact you, their messages will appear here."
                : `There are no inquiries currently marked as ${filterTab}.`}
            </p>
          </div>
        ) : (
          <div className="enquiries-cards-list">
            {filteredEnquiries.map((enquiry) => {
              const statusLower = enquiry.status?.toLowerCase() || "pending";
              const rawPhone = getCleanPhone(enquiry.student_phone);
              const studentInitial = enquiry.student_name
                ? enquiry.student_name.charAt(0).toUpperCase()
                : "S";

              return (
                <article className="inquiry-card" key={enquiry.id}>
                  {/* Card Header */}
                  <div className="inquiry-card-header">
                    <div className="inquiry-property-meta">
                      <Link
                        to={`/rooms/${enquiry.room_id}`}
                        className="inquiry-property-title"
                        title="View property details"
                      >
                        <Building2 size={15} />
                        <span>{enquiry.room_title || `Room #${enquiry.room_id}`}</span>
                        <ExternalLink size={12} className="link-arrow" />
                      </Link>
                      <span className="inquiry-id-tag">Inquiry #{enquiry.id}</span>
                    </div>

                    {/* Status Pill Badge */}
                    <div className={`inquiry-status-badge is-${statusLower}`}>
                      {statusLower === "accepted" && <CheckCircle2 size={13} />}
                      {statusLower === "pending" && <Clock size={13} />}
                      {statusLower === "rejected" && <XCircle size={13} />}
                      <span>{enquiry.status}</span>
                    </div>
                  </div>

                  {/* Student & Message Body */}
                  <div className="inquiry-card-body">
                    <div className="inquiry-student-row">
                      <div className="student-avatar">{studentInitial}</div>
                      <div>
                        <h4 className="student-name">{enquiry.student_name}</h4>
                        <div className="student-phone">
                          <Phone size={13} />
                          <span>{enquiry.student_phone || "No phone provided"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Student Message */}
                    <div className="inquiry-message-bubble">
                      <p>{enquiry.message || "Student is interested in visiting this property."}</p>
                    </div>
                  </div>

                  {/* Card Footer / Actions Toolbar */}
                  <div className="inquiry-card-footer">
                    {/* Status Change Selector */}
                    <div className="inquiry-status-selector">
                      <label htmlFor={`status-select-${enquiry.id}`}>Status:</label>
                      <select
                        id={`status-select-${enquiry.id}`}
                        value={enquiry.status}
                        onChange={(e) =>
                          handleStatusChange(enquiry.id, e.target.value)
                        }
                        disabled={updatingId === enquiry.id}
                        className="inquiry-select"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                      {updatingId === enquiry.id && (
                        <Loader2 size={13} className="spin-icon" />
                      )}
                    </div>

                    {/* Direct Contact Buttons */}
                    <div className="inquiry-action-buttons">
                      {rawPhone && (
                        <>
                          <a
                            href={`tel:${rawPhone}`}
                            className="inquiry-btn is-call"
                            title="Call student directly"
                          >
                            <PhoneCall size={13} /> Call
                          </a>

                          <a
                            href={`https://wa.me/${
                              rawPhone.length === 10 ? `91${rawPhone}` : rawPhone
                            }`}
                            target="_blank"
                            rel="noreferrer"
                            className="inquiry-btn is-whatsapp"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare size={13} /> WhatsApp
                          </a>
                        </>
                      )}

                      <Link
                        to={`/rooms/${enquiry.room_id}`}
                        className="inquiry-btn is-secondary"
                      >
                        View Listing
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default OwnerEnquiries;
