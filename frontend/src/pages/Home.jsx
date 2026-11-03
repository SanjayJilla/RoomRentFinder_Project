import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { getFavorites, addFavorite, removeFavorite } from "../services/favoritesApi";
import "../App.css";
import "./Home.css"; // UI CHANGE: page-specific styling without changing other pages

const API_URL = `${import.meta.env.VITE_API_URL}`;
const initialFilters = {
  location: "",
  max_rent: "",
  property_type: "",
  room_type: "",
  wifi: false,
  available_only: true,
};

function Home() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [filters, setFilters] = useState(initialFilters);

  // BUG FIX: favorites are loaded asynchronously; don't initialize state with getFavorites.
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoriteError, setFavoriteError] = useState("");
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchRooms = async () => {
      setLoading(true);
      setError("");
      try {
        const params = { available_only: filters.available_only };
        if (filters.location.trim()) params.location = filters.location.trim();
        if (filters.max_rent !== "") params.max_rent = Number(filters.max_rent);
        if (filters.property_type) params.property_type = filters.property_type;
        if (filters.room_type) params.room_type = filters.room_type;
        if (filters.wifi) params.wifi = true;

        const response = await axios.get(`${API_URL}/rooms`, {
          params,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setRooms(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        if (err.code !== "ERR_CANCELED" && !controller.signal.aborted) {
          setError("Unable to load rooms. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchRooms();
    return () => controller.abort();
  }, [filters]);

  useEffect(() => {
    const token = sessionStorage.getItem("student_access_token");
    if (!token) {
      return;
    }
    let active = true;
    getFavorites()
      .then((data) => {
        if (active) {
          setFavoriteIds(
            Array.isArray(data) ? data.map((item) => item.room_id) : []
          );
        }
      })
      .catch(() => {
        if (active) setFavoriteError("Unable to load saved rooms.");
      });
    return () => { active = false; };
  }, []);

  // BUG FIX: this handler must be inside Home(), not inside useEffect().
  const handleFavorite = async (roomId) => {
    if (!sessionStorage.getItem("student_access_token")) {
      navigate("/student/login");
      return;
    }
    if (favoriteLoadingId !== null) return;
    const isSaved = favoriteIds.includes(roomId);
    setFavoriteError("");
    setFavoriteLoadingId(roomId);
    try {
      if (isSaved) {
        await removeFavorite(roomId);
        setFavoriteIds((prev) => prev.filter((id) => id !== roomId));
      } else {
        await addFavorite(roomId);
        setFavoriteIds((prev) => prev.includes(roomId) ? prev : [...prev, roomId]);
      }
    } catch {
      setFavoriteError("Unable to update favorites. Please try again.");
    } finally {
      setFavoriteLoadingId(null);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetFilters = () => setFilters({ ...initialFilters });

  const sortedRooms = [...rooms].sort((a, b) => {
    if (sortBy === "price_low") return Number(a.rent) - Number(b.rent);
    if (sortBy === "price_high") return Number(b.rent) - Number(a.rent);
    if (sortBy === "availability") return Number(b.available_rooms) - Number(a.available_rooms);
    return 0;
  });

  return (
    <main className="rental-home">
      {/* UI CHANGE: a distinct hero section gives the home page a clear first impression. */}
      <section className="rental-hero">
        <div className="rental-hero-inner">
          <span className="rental-eyebrow">ROOMRENTFINDER · STUDENT LIVING</span>
          <h1>Find a room that <span>feels like home.</span></h1>
          <p>Discover PGs, apartments and independent rooms that fit your budget and lifestyle.</p>
          <a className="rental-hero-link" href="#room-listings">Explore available rooms <span aria-hidden="true">↗</span></a>
        </div>
        <div className="rental-hero-decoration" aria-hidden="true">
          <div className="rental-hero-house">⌂</div>
          <span>Find your space.</span>
        </div>
      </section>

      {/* UI CHANGE: filters have labels and a responsive grid instead of one crowded row. */}
      <section className="rental-search-panel" aria-label="Search and filter rooms">
        <div className="rental-panel-heading">
          <div>
            <span className="rental-section-kicker">START YOUR SEARCH</span>
            <h2>Find your next place</h2>
          </div>
          <button className="rental-reset" type="button" onClick={resetFilters}>↻ Reset filters</button>
        </div>
        <div className="rental-filter-grid">
          <label className="rental-field">
            <span>Location</span>
            <input name="location" type="text" placeholder="Enter city or area" value={filters.location} onChange={handleChange} />
          </label>
          <label className="rental-field">
            <span>Maximum monthly rent</span>
            <input name="max_rent" type="number" min="0" placeholder="e.g. 7000" value={filters.max_rent} onChange={handleChange} />
          </label>
          <label className="rental-field">
            <span>Property type</span>
            <select name="property_type" value={filters.property_type} onChange={handleChange}>
              <option value="">All properties</option>
              <option value="PG">PG</option>
              <option value="Apartment">Apartment</option>
              <option value="Independent Room">Independent Room</option>
            </select>
          </label>
          <label className="rental-field">
            <span>Room type</span>
            <select name="room_type" value={filters.room_type} onChange={handleChange}>
              <option value="">All room types</option>
              <option value="Single">Single</option>
              <option value="Double Sharing">Double Sharing</option>
              <option value="Triple Sharing">Triple Sharing</option>
            </select>
          </label>
        </div>
        <div className="rental-filter-footer">
          <div className="rental-checks">
            <label><input type="checkbox" name="wifi" checked={filters.wifi} onChange={handleChange} /> Wi-Fi included</label>
            <label><input type="checkbox" name="available_only" checked={filters.available_only} onChange={handleChange} /> Available only</label>
          </div>
          <span className="rental-filter-note">Listings update as you change filters</span>
        </div>
      </section>

      <section className="rental-listings" id="room-listings">
        {/* UI CHANGE: saved count now uses favoriteIds, which is the real API-backed state. */}
        {sessionStorage.getItem("student_access_token") && (
          <div className="rental-saved-strip">
            <div><span className="rental-saved-heart">♥</span><strong>{favoriteIds.length} saved {favoriteIds.length === 1 ? "room" : "rooms"}</strong><span className="rental-saved-hint">Keep your favorite places in one spot</span></div>
            <Link to="/favorites">View saved rooms →</Link>
          </div>
        )}
        <div className="rental-listings-heading">
          <div>
            <span className="rental-section-kicker">EXPLORE SPACES</span>
            <h2>Available listings <span className="rental-count">{loading ? "…" : rooms.length}</span></h2>
            <p>Browse places and find the right fit for you.</p>
          </div>
          <label className="rental-sort">
            <span>Sort by</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="default">Recommended</option>
              <option value="price_low">Price: low to high</option>
              <option value="price_high">Price: high to low</option>
              <option value="availability">Most rooms available</option>
            </select>
          </label>
        </div>

        {favoriteError && <p className="rental-alert" role="alert">{favoriteError}</p>}
        {loading && <div className="rental-state" role="status">Loading rooms…</div>}
        {error && <div className="rental-state rental-alert" role="alert">{error}</div>}
        {!loading && !error && rooms.length === 0 && (
          <div className="rental-state"><strong>No matching rooms found</strong><p>Try another location or adjust your filters.</p><button type="button" onClick={resetFilters}>Clear filters</button></div>
        )}

        {!loading && !error && rooms.length > 0 && (
          <div className="rental-card-grid">
            {sortedRooms.map((room) => {
              const isSaved = favoriteIds.includes(room.id);
              const available = Number(room.available_rooms) > 0;
              // UI CHANGE: safe handling of either a relative image path or an absolute URL.
              const imagePath = room.images?.[0];
              const imageUrl = typeof imagePath === "string"
                ? imagePath.startsWith("http") ? imagePath : `${API_URL}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`
                : null;
              return (
                <article className="rental-card" key={room.id}>
                  <div className="rental-card-media">
                    {imageUrl ? (
                      <img src={imageUrl} alt={room.title} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("rental-hidden"); }} />
                    ) : null}
                    <div className={`rental-card-placeholder ${imageUrl ? "rental-hidden" : ""}`}>⌂<span>Photo coming soon</span></div>
                    <span className={`rental-availability ${available ? "is-available" : "is-full"}`}>{available ? `${room.available_rooms} available` : "Fully occupied"}</span>
                    {/* BUG FIX: favorites click handler is now defined in component scope. */}
                    <button className={`rental-heart-btn ${isSaved ? "is-saved" : ""}`} type="button" aria-label={isSaved ? `Remove ${room.title} from saved rooms` : `Save ${room.title}`} aria-pressed={isSaved} disabled={favoriteLoadingId !== null} onClick={() => handleFavorite(room.id)}>{isSaved ? "♥" : "♡"}</button>
                  </div>
                  <div className="rental-card-body">
                    <div className="rental-card-category">{room.property_type || "Rental property"} <span>·</span> {room.room_type || "Room"}</div>
                    <h3>{room.title}</h3>
                    <p className="rental-card-location">⌖ {room.location || "Location not specified"}</p>
                    <div className="rental-amenities">
                      <span>{room.wifi ? "✓ Wi-Fi" : "No Wi-Fi"}</span>
                      {room.furnished && <span>✓ Furnished</span>}
                      {room.attached_bathroom && <span>✓ Attached bath</span>}
                    </div>
                    <div className="rental-card-bottom">
                      <div className="rental-price">₹{Number(room.rent).toLocaleString("en-IN")}<span>/month</span></div>
                      <Link className="rental-details-link" to={`/rooms/${room.id}`}>View details <span aria-hidden="true">→</span></Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default Home;
