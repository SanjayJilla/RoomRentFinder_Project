import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  HeartOff,
  MapPin,
  ArrowRight,
  Image as ImageIcon,
  Building2,
  Trash2,
  Sparkles,
} from "lucide-react";
import { isDemoRoom, getCleanTitle } from "../utils/demoHelper";
import { getFavorites, removeFavorite } from "../services/favoritesApi";
import "./Home.css";

function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    let active = true;

    getFavorites()
      .then((data) => {
        if (active) {
          setFavorites(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err.response?.data?.detail ||
              err.message ||
              "Unable to load saved rooms."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleRemove = async (roomId) => {
    setRemovingId(roomId);
    try {
      await removeFavorite(roomId);
      setFavorites((previous) =>
        previous.filter((room) => room.room_id !== roomId)
      );
    } catch (err) {
      alert(
        err.response?.data?.detail || "Unable to remove saved room."
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="student-dashboard-page">
      <div className="student-dashboard-container">
        {/* Header Banner */}
        <div className="student-dashboard-header">
          <div>
            <span className="student-dashboard-kicker">SAVED PROPERTIES</span>
            <h1>My Saved Rooms</h1>
            <p>
              Compare your bookmarked rooms and pick the best option for your stay.
            </p>
          </div>

          <Link to="/" className="student-explore-btn">
            Explore More Rooms <ArrowRight size={15} style={{ marginLeft: "6px" }} />
          </Link>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="student-enquiries-empty">
            <p>Loading your saved rooms...</p>
          </div>
        ) : error ? (
          <div className="student-enquiries-empty error">
            <p>{error}</p>
          </div>
        ) : favorites.length === 0 ? (
          /* Empty State */
          <div className="student-enquiries-empty">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                backgroundColor: "#fff1f2",
                color: "#e11d48",
                marginBottom: "16px",
              }}
            >
              <HeartOff size={28} />
            </div>

            <h3>No saved rooms yet</h3>

            <p>
              When you find a room you like on the explore page, tap the heart icon
              to save it here for quick access.
            </p>

            <Link to="/" className="student-explore-btn">
              Browse Available Rooms
            </Link>
          </div>
        ) : (
          /* Cards Grid */
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <span className="student-enquiries-count">
                {favorites.length} {favorites.length === 1 ? "Property" : "Properties"} Saved
              </span>
            </div>

            <div className="rental-card-grid">
              {favorites.map((room) => {
                const available = Number(room.available_rooms) > 0;
                const isDemo = isDemoRoom(room);
                const cleanTitle = getCleanTitle(room.title);
                const imagePath = room.images?.[0];
                const imageUrl =
                  typeof imagePath === "string"
                    ? imagePath.startsWith("http")
                      ? imagePath
                      : `${API_URL}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`
                    : null;

                return (
                  <article className="rental-card" key={room.room_id}>
                    {/* Media Container */}
                    <div className="rental-card-media">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={cleanTitle}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling?.classList.remove(
                              "rental-hidden"
                            );
                          }}
                        />
                      ) : null}

                      <div
                        className={`rental-card-placeholder ${
                          imageUrl ? "rental-hidden" : ""
                        }`}
                      >
                        <ImageIcon size={32} strokeWidth={1.5} />
                        <span>No Photo Available</span>
                      </div>

                      <span
                        className={`rental-availability ${
                          available ? "is-available" : "is-full"
                        }`}
                      >
                        {available
                          ? `${room.available_rooms} available`
                          : "Fully occupied"}
                      </span>

                      {isDemo && (
                        <span className="rental-demo-badge">
                          <Sparkles size={10} /> Demo
                        </span>
                      )}

                      {/* Remove Button */}
                      <button
                        className="rental-heart-btn is-saved"
                        type="button"
                        aria-label={`Remove ${cleanTitle} from saved rooms`}
                        disabled={removingId === room.room_id}
                        onClick={() => handleRemove(room.room_id)}
                        title="Remove from saved"
                      >
                        <Heart
                          size={18}
                          fill="#e11d48"
                          color="#e11d48"
                          strokeWidth={0}
                        />
                      </button>
                    </div>

                    {/* Body */}
                    <div className="rental-card-body">
                      <div className="rental-card-category">
                        {room.property_type || "Rental"} <span>·</span>{" "}
                        {room.room_type || "Room"}
                      </div>

                      <h3>{cleanTitle}</h3>

                      <p className="rental-card-location">
                        <MapPin size={13} className="location-pin-icon" />
                        <span className="location-name">
                          {room.location || "Location not specified"}
                        </span>
                      </p>

                      <div className="rental-card-bottom">
                        <div className="rental-price">
                          ₹{Number(room.rent).toLocaleString("en-IN")}
                          <span>/month</span>
                        </div>

                        <Link
                          className="rental-details-link"
                          to={`/rooms/${room.room_id}`}
                        >
                          View details <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Favorites;
