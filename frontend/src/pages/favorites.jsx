
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFavorites, removeFavorite } from "../services/favoritesApi";

function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    try {
      await removeFavorite(roomId);

      setFavorites((previous) =>
        previous.filter((room) => room.room_id !== roomId)
      );
    } catch (err) {
      alert(
        err.response?.data?.detail ||
        "Unable to remove saved room."
      );
    }
  };

  return (
    <div className="container">
      <h1>My Saved Rooms</h1>

      {loading ? (
        <p>Loading saved rooms...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : favorites.length === 0 ? (
        <p>No saved rooms yet. Explore rooms and save your favorites.</p>
      ) : (
        <div className="room-grid">
          {favorites.map((room) => (
            <div className="room-card" key={room.room_id}>
              {room.images && room.images.length > 0 ? (
                <img
                  src={
                    room.images[0].startsWith("http")
                      ? room.images[0]
                      : `${import.meta.env.VITE_API_URL}${room.images[0]}`
                  }
                  alt={room.title}
                  className="room-card-image"
                />
              ) : (
                <div className="room-image-placeholder">
                  No Photo Available
                </div>
              )}

              <div className="room-card-details">
                <h3>{room.title}</h3>
                <p>📍 {room.location}</p>
                <h3>₹{room.rent} / month</h3>

                <p>
                  {room.available_rooms > 0
                    ? `${room.available_rooms} rooms available`
                    : "Fully Occupied"}
                </p>

                <button
                  type="button"
                  className="favorite-btn"
                  onClick={() => handleRemove(room.room_id)}
                >
                  ♥ Remove from Saved
                </button>

                <Link
                  to={`/rooms/${room.room_id}`}
                  className="primary-btn"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Favorites;
