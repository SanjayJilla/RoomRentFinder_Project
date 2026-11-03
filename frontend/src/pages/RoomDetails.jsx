import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getFavorites, addFavorite, removeFavorite } from "../services/favoritesApi";

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
    const token = sessionStorage.getItem("student_access_token");

    if (!token) {
      navigate("/student/login");
      return;
    }

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

      setEnquirySuccess("Your enquiry has been sent successfully!");
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
        ← Back to Listings
      </Link>

      {/* Property header */}
      <div className="details-header">
        <div>
          <span className="details-kicker">PROPERTY DETAILS</span>
          <h1>{room.title}</h1>
          <p className="details-location">📍 {room.location}</p>
        </div>

        <div className="details-header-actions">
          <button
            type="button"
            className={`details-favorite-btn ${isSaved ? "is-saved" : ""}`}
            onClick={handleToggleFavorite}
            disabled={favoriteLoading}
            aria-label={isSaved ? "Remove from saved rooms" : "Save to favorites"}
          >
            {favoriteLoading
              ? "⏳ Updating..."
              : isSaved
              ? "♥ Saved to Favorites"
              : "♡ Save to Favorites"}
          </button>

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

      {favoriteFeedback && (
        <p className="details-favorite-feedback" role="status">
          {favoriteFeedback}
        </p>
      )}

      {/* Property photos */}
      {room.images?.length > 0 ? (
        <div className="details-gallery">
          {room.images.map((imageUrl, index) => (
            <img
              key={`${imageUrl}-${index}`}
              src={
                imageUrl.startsWith("http")
                  ? imageUrl
                  : `${import.meta.env.VITE_API_URL}${imageUrl}`
              }
              alt={`${room.title} photo ${index + 1}`}
              className="details-gallery-image"
              loading="lazy"
            />
          ))}
        </div>
      ) : (
        <div className="details-no-image">
          🏠 No property photos uploaded yet
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
                ["📶 Wi-Fi", room.wifi],
                ["🛏️ Furnished", room.furnished],
                ["🚿 Attached Bathroom", room.attached_bathroom],
                ["🍽️ Food Included", room.food_included],
              ].map(([label, enabled]) => (
                <div className="details-amenity" key={label}>
                  <span>{label}</span>
                  <strong className={enabled ? "amenity-yes" : "amenity-no"}>
                    {enabled ? "✓ Yes" : "✕ No"}
                  </strong>
                </div>
              ))}
            </div>
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

            {room.owner_phone ? (
              <div className="details-contact">
                <p>
                  Owner: <strong>{room.owner_name || "Property Owner"}</strong>
                </p>

                <a
                  href={`tel:${room.owner_phone}`}
                  className="details-call-btn"
                >
                  📞 Call Owner
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
          </section>

        </aside>
      </div>
    </div>
  </div>
);
  
  
}

export default RoomDetails;