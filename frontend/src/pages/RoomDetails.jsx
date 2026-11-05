import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getFavorites, addFavorite, removeFavorite } from "../services/favoritesApi";
import LoginPromptModal from "../components/LoginPromptModal";
import {
  MapPin,
  Heart,
  Copy,
  Check,
  Navigation,
  ArrowLeft,
  ArrowUpRight,
  PhoneCall,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Lock,
  Building2,
} from "lucide-react";
import { isDemoRoom, getCleanTitle } from "../utils/demoHelper";

function RoomDetails() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enquiry, setEnquiry] = useState({
    message: "",
  });

  const [sending, setSending] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState("");
  const [enquiryError, setEnquiryError] = useState("");

  const [isSaved, setIsSaved] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteFeedback, setFavoriteFeedback] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const detailMapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const isLoggedIn = () =>
    !!(sessionStorage.getItem("student_access_token") || sessionStorage.getItem("access_token"));

  const [showLoginModal, setShowLoginModal] = useState(!isLoggedIn());

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    if (!isLoggedIn()) {
      navigate("/");
    }
  };

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/rooms/${roomId}`
        );

        setRoom(response.data);
      } catch (err) {
        setError(
          err.response?.status === 404
            ? "Room not found."
            : "Unable to load room details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  useEffect(() => {
    const token = sessionStorage.getItem("student_access_token");
    if (!token) return;

    let active = true;
    getFavorites()
      .then((data) => {
        if (active && Array.isArray(data)) {
          const found = data.some(
            (item) => Number(item.room_id) === Number(roomId)
          );
          setIsSaved(found);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [roomId]);

  const handleToggleFavorite = async () => {
    if (!isLoggedIn()) {
      setShowLoginModal(true);
      return;
    }

    // Owner check: do NOT redirect to student login!
    if (sessionStorage.getItem("access_token")) {
      setFavoriteFeedback("You are signed in as a Property Owner. Saving favorites is available for User accounts.");
      return;
    }

    const token = sessionStorage.getItem("student_access_token");

    if (!token) return;

    if (favoriteLoading) return;

    setFavoriteLoading(true);
    setFavoriteFeedback("");

    try {
      if (isSaved) {
        await removeFavorite(Number(roomId));
        setIsSaved(false);
        setFavoriteFeedback("Removed from your saved rooms");
      } else {
        await addFavorite(Number(roomId));
        setIsSaved(true);
        setFavoriteFeedback("Saved to your rooms!");
      }
    } catch (err) {
      setFavoriteFeedback(
        err.response?.data?.detail || "Unable to update saved rooms."
      );
    } finally {
      setFavoriteLoading(false);
    }
  };

  const hasCoords = typeof room?.latitude === "number" && typeof room?.longitude === "number";

  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${room.latitude},${room.longitude}`
    : room?.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(room.location)}`
    : null;

  const handleCopyAddress = () => {
    if (room?.location) {
      navigator.clipboard.writeText(room.location);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (!hasCoords || !detailMapRef.current || mapInstanceRef.current || !window.L) return;

    const L = window.L;
    const map = L.map(detailMapRef.current, {
      center: [room.latitude, room.longitude],
      zoom: 14,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(map);

    const propertyPinIcon = L.divIcon({
      className: "detail-property-pin-container",
      html: `
        <div class="detail-property-pin-pulse"></div>
        <div class="detail-property-pin-inner">
          <span style="font-size:16px;">🏠</span>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    const marker = L.marker([room.latitude, room.longitude], { icon: propertyPinIcon }).addTo(map);
    marker.bindPopup(`<div style="font-size:12px;font-weight:700;color:#0f172a;">${getCleanTitle(room.title)}</div><div style="font-size:11px;color:#64748b;margin-top:2px;">${room.location}</div>`).openPopup();

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [room, hasCoords]);

  if (loading) return <p>Loading property details...</p>;

  if (error) return <p className="error">{error}</p>;

  if (!room) return null;

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();

    setEnquirySuccess("");
    setEnquiryError("");

    const token = sessionStorage.getItem("student_access_token");

    if (!token) {
      navigate("/student/login");
      return;
    }

    try {
      setSending(true);

      await axios.post(
        `${import.meta.env.VITE_API_URL}/rooms/${roomId}/enquiries`,
        {
          message: enquiry.message.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setEnquirySuccess(
        isDemoRoom(room)
          ? "Enquiry recorded! Since this is a demonstration listing, your message has been saved to your student dashboard for testing."
          : "Your enquiry has been sent successfully!"
      );
      setEnquiry({ message: "" });
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        sessionStorage.removeItem("student_access_token");
        sessionStorage.removeItem("student_name");
        navigate("/student/login");
        return;
      }

      setEnquiryError(
        err.response?.data?.detail ||
          "Unable to send enquiry. Please try again."
      );
    } finally {
      setSending(false);
    }
  };
  return (
  <div className="details-page">
    <div className="details-container">

      <Link to="/" className="details-back">
        <ArrowLeft size={14} /> Back to Listings
      </Link>

      {/* Property header */}
      <div className="details-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span className="details-kicker" style={{ margin: 0 }}>PROPERTY DETAILS</span>
            {isDemoRoom(room) && (
              <span className="details-demo-pill">
                <Sparkles size={11} /> Demo Listing
              </span>
            )}
          </div>
          <h1>{getCleanTitle(room.title)}</h1>
          <p className="details-location">
            <MapPin size={14} className="details-pin" /> {room.location}
          </p>
        </div>

        <div className="details-header-actions">
          {sessionStorage.getItem("access_token") ? (
            <Link
              to="/owner/dashboard"
              className="details-favorite-btn"
              style={{ textDecoration: "none", color: "#2563eb", background: "#eff6ff", borderColor: "#bfdbfe", display: "inline-flex", alignItems: "center", gap: "6px" }}
              title="You are signed in as a Property Owner"
            >
              <Building2 size={15} /> Owner Portal
            </Link>
          ) : (
            <button
              type="button"
              className={`details-favorite-btn ${isSaved ? "is-saved" : ""}`}
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              aria-label={isSaved ? "Remove from saved rooms" : "Save to favorites"}
            >
              <Heart
                size={15}
                fill={isSaved ? "#e11d48" : "none"}
                color={isSaved ? "#e11d48" : "#475569"}
                strokeWidth={isSaved ? 0 : 2}
              />
              {favoriteLoading
                ? "Updating..."
                : isSaved
                ? "Saved to Favorites"
                : "Save to Favorites"}
            </button>
          )}

          <span
            className={`details-status ${
              room.available_rooms > 0 ? "available" : "occupied"
            }`}
          >
            {room.available_rooms > 0
              ? `${room.available_rooms} Rooms Available`
              : "Fully Occupied"}
          </span>
        </div>
      </div>

      {isDemoRoom(room) && (
        <div className="details-demo-banner">
          <Sparkles size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Sample Demonstration Listing:</strong> This property is a sample preview to showcase search, distance mapping, and inquiry features. Real owner listings are verified.
          </div>
        </div>
      )}

      {favoriteFeedback && (
        <p className="details-favorite-feedback" role="status">
          {favoriteFeedback}
        </p>
      )}

      {/* Property photos */}
      {room.images?.length > 0 ? (
        (() => {
          const count = room.images.length;
          const getImgUrl = (path) =>
            path.startsWith("http")
              ? path
              : `${import.meta.env.VITE_API_URL}${path.startsWith("/") ? "" : "/"}${path}`;

          if (count === 1) {
            return (
              <div className="details-gallery gallery-count-1">
                <div
                  className="gallery-hero-item"
                  onClick={() => setLightboxIndex(0)}
                  title="Click to view full size"
                >
                  <img
                    src={getImgUrl(room.images[0])}
                    alt={`${room.title} photo 1`}
                    loading="lazy"
                  />
                </div>
              </div>
            );
          }

          if (count === 2) {
            return (
              <div className="details-gallery gallery-count-2">
                {room.images.map((path, idx) => (
                  <div
                    className="gallery-item"
                    key={`img-${idx}`}
                    onClick={() => setLightboxIndex(idx)}
                    title="Click to view full size"
                  >
                    <img
                      src={getImgUrl(path)}
                      alt={`${room.title} photo ${idx + 1}`}
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            );
          }

          // 3 or more photos: Airbnb layout (1 hero left + 2 stacked right)
          return (
            <div className="details-gallery gallery-count-3">
              <div
                className="gallery-hero-col"
                onClick={() => setLightboxIndex(0)}
                title="Click to view full size"
              >
                <img
                  src={getImgUrl(room.images[0])}
                  alt={`${room.title} photo 1`}
                  loading="lazy"
                />
              </div>

              <div className="gallery-side-col">
                {room.images.slice(1, 3).map((path, idx) => (
                  <div
                    className="gallery-side-item"
                    key={`side-img-${idx}`}
                    onClick={() => setLightboxIndex(idx + 1)}
                    title="Click to view full size"
                  >
                    <img
                      src={getImgUrl(path)}
                      alt={`${room.title} photo ${idx + 2}`}
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      ) : (
        <div className="details-no-image">
          <ImageIcon size={28} />
          <span>No property photos uploaded yet</span>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxIndex !== null && room.images?.[lightboxIndex] && (
        <div
          className="gallery-lightbox-overlay"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="gallery-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="gallery-lightbox-close"
              onClick={() => setLightboxIndex(null)}
              aria-label="Close photo preview"
            >
              <X size={20} />
            </button>

            {room.images.length > 1 && (
              <>
                <button
                  type="button"
                  className="gallery-lightbox-nav prev"
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev === 0 ? room.images.length - 1 : prev - 1
                    )
                  }
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={24} />
                </button>

                <button
                  type="button"
                  className="gallery-lightbox-nav next"
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev === room.images.length - 1 ? 0 : prev + 1
                    )
                  }
                  aria-label="Next photo"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            <img
              src={
                room.images[lightboxIndex].startsWith("http")
                  ? room.images[lightboxIndex]
                  : `${import.meta.env.VITE_API_URL}${room.images[lightboxIndex].startsWith("/") ? "" : "/"}${room.images[lightboxIndex]}`
              }
              alt={`${room.title} view ${lightboxIndex + 1}`}
            />

            <div className="gallery-lightbox-counter">
              Photo {lightboxIndex + 1} of {room.images.length}
            </div>
          </div>
        </div>
      )}

      {/* Main two-column layout */}
      <div className="details-layout">

        {/* Left side */}
        <div className="details-main">

          <section className="details-card">
            <h2>Property Information</h2>

            <div className="details-info-grid">
              {[
                ["Property Type", room.property_type],
                ["Room Type", room.room_type],
                ["Total Rooms", room.total_rooms],
                ["Available Rooms", room.available_rooms],
                ["Gender Preference", room.gender_preference],
              ].map(([label, value]) => (
                <div className="details-info-item" key={label}>
                  <span>{label}</span>
                  <strong>{value ?? "Not specified"}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="details-card">
            <h2>Amenities</h2>

            <div className="details-amenities">
              {[
                ["Wi-Fi", room.wifi],
                ["Furnished", room.furnished],
                ["Attached Bathroom", room.attached_bathroom],
                ["Food Included", room.food_included],
              ].map(([label, enabled]) => (
                <div className="details-amenity" key={label}>
                  <span>{label}</span>
                  <strong className={enabled ? "amenity-yes" : "amenity-no"}>
                    {enabled ? "Available" : "Not included"}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          <section className="details-card details-location-card">
            <div className="details-card-header-row">
              <div>
                <h2>Location & Neighborhood</h2>
                <p className="details-location-text">
                  <MapPin size={14} className="details-pin" /> {room.location || "Location not specified"}
                </p>
              </div>
              <div className="details-location-actions">
                <button
                  type="button"
                  className="details-copy-btn"
                  onClick={handleCopyAddress}
                  title="Copy address"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy Address"}
                </button>
                {directionsUrl && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="details-directions-btn"
                  >
                    <Navigation size={13} /> Get Directions <ArrowUpRight size={13} />
                  </a>
                )}
              </div>
            </div>

            {hasCoords ? (
              <div
                ref={detailMapRef}
                className="details-leaflet-map"
                style={{ width: "100%", height: "280px", borderRadius: "12px", marginTop: "14px" }}
              />
            ) : (
              <div className="details-map-fallback">
                <p>Exact GPS coordinates not set for this listing.</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(room.location || "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="details-directions-btn"
                >
                  <Navigation size={13} /> Search Area on Google Maps <ArrowUpRight size={13} />
                </a>
              </div>
            )}
          </section>

          <section className="details-card">
            <h2>Description</h2>
            <p className="details-description">
              {room.description || "No description provided."}
            </p>
          </section>

        </div>

        {/* Right side */}
        <aside className="details-sidebar">

          <section className="details-card details-price-card">
            <span className="details-price-label">MONTHLY RENT</span>

            <div className="details-price">
              ₹{Number(room.rent).toLocaleString("en-IN")}
              <span>/month</span>
            </div>

            <div className="details-deposit">
              <span>Security Deposit</span>
              <strong>
                ₹{Number(room.deposit ?? 0).toLocaleString("en-IN")}
              </strong>
            </div>
          </section>

          <section className="details-card">
            <h2>Contact Owner</h2>

            {!isLoggedIn() ? (
              <div className="details-contact">
                <p>Owner contact details are protected.</p>
                <button
                  type="button"
                  className="details-call-btn"
                  onClick={() => setShowLoginModal(true)}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", cursor: "pointer", border: "none" }}
                >
                  <Lock size={15} style={{ marginRight: "6px" }} /> Login to View Phone &amp; Call
                </button>
              </div>
            ) : room.owner_phone ? (
              <div className="details-contact">
                <p>
                  Owner: <strong>{room.owner_name || "Property Owner"}</strong>
                </p>

                <a
                  href={`tel:${room.owner_phone}`}
                  className="details-call-btn"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                >
                  <PhoneCall size={15} style={{ marginRight: "6px" }} /> Call Owner
                </a>
              </div>
            ) : (
              <p>Owner contact information is unavailable.</p>
            )}
          </section>

          <section className="details-card">
            <h2>Interested in this property?</h2>
            <p className="details-enquiry-subtitle">
              Send an enquiry directly to the property owner.
            </p>

            {!isLoggedIn() ? (
              <div style={{ marginTop: "14px", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "14px", lineHeight: "1.5" }}>
                  Sign in with your account to contact the owner and send enquiries.
                </p>
                <button
                  type="button"
                  className="details-enquiry-btn"
                  onClick={() => setShowLoginModal(true)}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none" }}
                >
                  <Lock size={15} style={{ marginRight: "6px" }} /> Login to Send Enquiry
                </button>
              </div>
            ) : sessionStorage.getItem("access_token") ? (
              <div style={{ marginTop: "14px", padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                <Building2 size={24} style={{ color: "#2563eb", margin: "0 auto 8px", display: "block" }} />
                <p style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
                  Property Owner Account
                </p>
                <p style={{ fontSize: "12.5px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>
                  You are signed in as a Property Owner. Rental enquiries can only be submitted from User accounts looking to rent.
                </p>
                <Link
                  to="/owner/dashboard"
                  className="details-enquiry-btn"
                  style={{ display: "inline-block", marginTop: "12px", textDecoration: "none", textAlign: "center" }}
                >
                  Go to Owner Dashboard
                </Link>
              </div>
            ) : (
              <form
                onSubmit={handleEnquirySubmit}
                className="details-enquiry-form"
              >
                <label htmlFor="enquiry-message">Your Message</label>

                <textarea
                  id="enquiry-message"
                  placeholder="I'm interested in this room. Is it available for a visit?"
                  value={enquiry.message}
                  onChange={(e) =>
                    setEnquiry({
                      ...enquiry,
                      message: e.target.value,
                    })
                  }
                  minLength={5}
                  maxLength={1000}
                  rows={5}
                  required
                />

                {enquirySuccess && (
                  <p className="enquiry-success">{enquirySuccess}</p>
                )}

                {enquiryError && (
                  <p className="error">{enquiryError}</p>
                )}

                <button
                  type="submit"
                  className="details-enquiry-btn"
                  disabled={sending || room.available_rooms <= 0}
                >
                  {sending
                    ? "Sending..."
                    : room.available_rooms <= 0
                    ? "Currently Unavailable"
                    : "Send Enquiry"}
                </button>
              </form>
            )}
          </section>

        </aside>
      </div>
    </div>

    {showLoginModal && (
      <LoginPromptModal
        onClose={handleCloseLoginModal}
        targetPath={`/rooms/${roomId}`}
      />
    )}
  </div>
);
  
  
}

export default RoomDetails;