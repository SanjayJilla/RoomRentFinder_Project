import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function OwnerDashboard() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");

    axios
      .get(`${import.meta.env.VITE_API_URL}/owners/me/rooms`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        setRooms(response.data);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          sessionStorage.removeItem("access_token");
          navigate("/login", { replace: true });
        } else {
          setError("Unable to load your rooms.");
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);
  //delete function
  const handleDelete = async (roomId) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this property?"
  );
  

  if (!confirmed) return;

  try {
    const token = sessionStorage.getItem("access_token");

    await axios.delete(
      `${import.meta.env.VITE_API_URL}/rooms/${roomId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setRooms((previousRooms) =>
      previousRooms.filter((room) => room.id !== roomId)
    );

  } catch (err) {
    alert(
      err.response?.data?.detail || "Unable to delete property"
    );
  }
};
const totalProperties = rooms.length;

const availableProperties = rooms.filter(
  (room) => room.available_rooms > 0
).length;

const occupiedProperties = rooms.filter(
  (room) => room.available_rooms <= 0
).length;

  return (
  <div className="owner-dashboard-page">
    <div className="owner-dashboard-container">

      {/* Dashboard header */}
      <div className="owner-dashboard-header">
        <div>
          <span className="owner-dashboard-kicker">
            OWNER WORKSPACE
          </span>

          <h1>Owner Dashboard</h1>

          <p>
            Manage your rental properties, photos, and availability.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="owner-add-btn"
            onClick={() => navigate("/owner/add-room")}
          >
            + Add Property
          </button>
          <button
            type="button"
            className="owner-add-btn"
            style={{ backgroundColor: "var(--accent, #4f46e5)" }}
            onClick={() => navigate("/owner/enquiries")}
          >
            📩 View Enquiries
          </button>
        </div>
      </div>

      {/* Dashboard statistics */}
      {!loading && !error && (
        <div className="owner-stats-grid">

          <div className="owner-stat-card">
            <div className="owner-stat-icon">🏠</div>
            <span>Total Properties</span>
            <strong>{totalProperties}</strong>
            <p>Your rental listings</p>
          </div>

          <div className="owner-stat-card">
            <div className="owner-stat-icon">✓</div>
            <span>Available Properties</span>
            <strong>{availableProperties}</strong>
            <p>Properties with vacant rooms</p>
          </div>

          <div className="owner-stat-card">
            <div className="owner-stat-icon">⌛</div>
            <span>Fully Occupied</span>
            <strong>{occupiedProperties}</strong>
            <p>Properties with no vacant rooms</p>
          </div>

        </div>
      )}

      {/* Property listings */}
      <div className="owner-listings-heading">
        <div>
          <h2>My Properties</h2>
          <p>View and manage all your listed properties.</p>
        </div>

        {!loading && !error && (
          <span className="owner-listings-count">
            {totalProperties} Listings
          </span>
        )}
      </div>

      {loading ? (
        <div className="owner-dashboard-message">
          Loading your rooms...
        </div>
      ) : error ? (
        <div className="owner-dashboard-message error">
          {error}
        </div>
      ) : rooms.length === 0 ? (
        <div className="owner-empty-state">
          <div className="owner-empty-icon">🏠</div>

          <h3>No properties added yet</h3>

          <p>
            Add your first rental property to start receiving
            enquiries from students.
          </p>

          <button
            type="button"
            className="owner-add-btn"
            onClick={() => navigate("/owner/add-room")}
          >
            + Add Your First Property
          </button>
        </div>
      ) : (
        <div className="owner-properties">
          {rooms.map((room) => (
            <div className="owner-property-card" key={room.id}>

              {/* Property image */}
              {room.images?.length > 0 ? (
                <img
                  src={
                    room.images[0].startsWith("http")
                      ? room.images[0]
                      : `${import.meta.env.VITE_API_URL}${room.images[0]}`
                  }
                  alt={room.title}
                  className="owner-property-image"
                />
              ) : (
                <div className="owner-property-placeholder">
                  <span>🏠</span>
                  <p>No Photo Available</p>
                </div>
              )}

              {/* Property information */}
              <div className="owner-property-content">

                <div className="owner-property-heading">
                  <h3>{room.title}</h3>

                  <span
                    className={
                      room.available_rooms > 0
                        ? "status-available"
                        : "status-occupied"
                    }
                  >
                    {room.available_rooms > 0
                      ? "Available"
                      : "Fully Occupied"}
                  </span>
                </div>

                <p className="owner-property-location">
                  📍 {room.location}
                </p>

                <div className="owner-property-price">
                  ₹{Number(room.rent).toLocaleString("en-IN")}
                  <span> / month</span>
                </div>

                <div className="owner-property-availability">
                  <span>Rooms Available</span>
                  <strong>
                    {room.available_rooms} / {room.total_rooms}
                  </strong>
                </div>

                {/* Existing actions */}
                <div className="owner-property-actions">

                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/owner/edit-room/${room.id}`)
                    }
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/owner/rooms/${room.id}/photos`)
                    }
                  >
                    Manage Photos
                  </button>

                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => handleDelete(room.id)}
                  >
                    Delete
                  </button>

                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  </div>
);
}

export default OwnerDashboard;