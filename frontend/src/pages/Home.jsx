import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getFavorites, addFavorite, removeFavorite } from "../services/favoritesApi";
import RoomMap from "../components/RoomMap";
import LoginPromptModal from "../components/LoginPromptModal";
import {
  MapPin,
  Crosshair,
  RotateCcw,
  Heart,
  LayoutGrid,
  Map as MapIcon,
  ArrowRight,
  Check,
  X,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { isDemoRoom, getCleanTitle } from "../utils/demoHelper";
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
  const location = useLocation();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [filters, setFilters] = useState(initialFilters);
  const [viewMode, setViewMode] = useState("list"); // "list" | "map"

  // Login gate modal state — also auto-opens if ?login=1 in URL (e.g. from RoomDetails redirect)
  const [loginPrompt, setLoginPrompt] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return { open: params.get("login") === "1", targetPath: params.get("next") || null, roleNotice: null };
  });

  // Near me geolocation state
  const [userCoords, setUserCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [radiusKm, setRadiusKm] = useState(10);

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
        if (userCoords) {
          params.lat = userCoords.lat;
          params.lng = userCoords.lng;
          params.radius_km = radiusKm;
        }

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
  }, [filters, userCoords, radiusKm]);

  const handleGetNearbyRooms = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setLocationError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
        setSortBy("distance");
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocationError("Location permission denied. Please allow location access in your browser.");
        } else {
          setLocationError("Unable to retrieve location. Please check GPS or network.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const clearNearbyFilter = () => {
    setUserCoords(null);
    setLocationError("");
    if (sortBy === "distance") setSortBy("default");
  };

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
    const isOwner = !!sessionStorage.getItem("access_token");
    const isStudent = !!sessionStorage.getItem("student_access_token");

    // 1. If currently signed in as Owner, show role notice instead of generic login prompt
    if (isOwner) {
      setLoginPrompt({
        open: true,
        targetPath: "/student/login",
        roleNotice: {
          title: "Property Owner Mode",
          message: "You are currently signed in as a Property Owner. Saving favorite properties is a feature designed for student renters.",
          targetRole: "Student",
        },
      });
      return;
    }

    // 2. If guest (not signed in at all), show standard login modal
    if (!isStudent) {
      setLoginPrompt({ open: true, targetPath: "/student/login", roleNotice: null });
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

  const resetFilters = () => {
    setFilters({ ...initialFilters });
    setUserCoords(null);
    setLocationError("");
    setSortBy("default");
  };

  const sortedRooms = [...rooms].sort((a, b) => {
    if (sortBy === "distance") return (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity);
    if (sortBy === "price_low") return Number(a.rent) - Number(b.rent);
    if (sortBy === "price_high") return Number(b.rent) - Number(a.rent);
    if (sortBy === "availability") return Number(b.available_rooms) - Number(a.available_rooms);
    return 0;
  });

  // ---- LOGIN GATE ------------------------------------------------
  const isLoggedIn = () =>
    !!(sessionStorage.getItem("student_access_token") || sessionStorage.getItem("access_token"));

  const handleViewDetails = (e, room) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!isLoggedIn()) {
      setLoginPrompt({ open: true, targetPath: `/rooms/${room.id}` });
      return;
    }
    navigate(`/rooms/${room.id}`);
  };

  return (
    <main className="rental-home">
      {/* Login gate modal */}
      {loginPrompt.open && (
        <LoginPromptModal
          onClose={() => setLoginPrompt({ open: false, targetPath: null, roleNotice: null })}
          targetPath={loginPrompt.targetPath}
          roleNotice={loginPrompt.roleNotice}
        />
      )}
      {/* UI CHANGE: a distinct hero section gives the home page a clear first impression. */}
      <section className="rental-hero">
        <div className="rental-hero-inner">
          <span className="rental-eyebrow">ROOMRENTFINDER · STUDENT LIVING</span>
          <h1>Find a room that <span>feels like home.</span></h1>
          <p>Discover verified PGs, apartments and independent rooms that fit your budget and student lifestyle.</p>
          <a className="rental-hero-link" href="#room-listings">
            Explore available rooms <ArrowRight size={15} />
          </a>
        </div>
      </section>

      {/* UI CHANGE: filters have labels and a responsive grid instead of one crowded row. */}
      <section className="rental-search-panel" aria-label="Search and filter rooms">
        <div className="rental-panel-heading">
          <div>
            <span className="rental-section-kicker">START YOUR SEARCH</span>
            <h2>Find your next place</h2>
          </div>
          <div className="rental-panel-actions">
            <button
              className={`rental-near-me-btn ${userCoords ? "is-active" : ""}`}
              type="button"
              onClick={userCoords ? clearNearbyFilter : handleGetNearbyRooms}
              disabled={locating}
            >
              <Crosshair size={14} className={locating ? "spin-icon" : ""} />
              {locating ? "Locating…" : userCoords ? "Near Me Active" : "Find Near Me"}
              {userCoords && <X size={13} className="clear-chip-icon" />}
            </button>
            <button className="rental-reset" type="button" onClick={resetFilters}>
              <RotateCcw size={13} />
              Reset filters
            </button>
          </div>
        </div>

        {userCoords && (
          <div className="rental-nearby-banner">
            <div className="rental-nearby-banner-content">
              <MapPin size={15} className="nearby-pin-icon" />
              <span>Showing rooms within</span>
              <select
                className="rental-radius-select"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                aria-label="Filter radius in kilometers"
              >
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
                <option value={50}>50 km</option>
              </select>
              <span>of your location</span>
            </div>
            <button
              type="button"
              className="rental-clear-nearby"
              onClick={clearNearbyFilter}
              title="Remove location filter"
            >
              <X size={14} /> Clear
            </button>
          </div>
        )}

        {locationError && (
          <div className="rental-location-error" role="alert">
            {locationError}
          </div>
        )}
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
            <div className="rental-saved-info">
              <Heart size={16} className="rental-saved-heart" fill="#e11d48" color="#e11d48" />
              <strong>{favoriteIds.length} saved {favoriteIds.length === 1 ? "room" : "rooms"}</strong>
              <span className="rental-saved-hint">Keep your favorite places in one spot</span>
            </div>
            <Link to="/favorites" className="rental-saved-link">
              View saved rooms <ArrowRight size={14} />
            </Link>
          </div>
        )}
        <div className="rental-listings-heading">
          <div>
            <span className="rental-section-kicker">EXPLORE SPACES</span>
            <h2>Available listings <span className="rental-count">{loading ? "…" : rooms.length}</span></h2>
            <p>Browse places and find the right fit for you.</p>
          </div>
          <div className="rental-listings-controls">
            <div className="rental-view-toggle" role="group" aria-label="View layout">
              <button
                type="button"
                className={`rental-toggle-btn ${viewMode === "list" ? "is-active" : ""}`}
                onClick={() => setViewMode("list")}
              >
                <LayoutGrid size={15} />
                List
              </button>
              <button
                type="button"
                className={`rental-toggle-btn ${viewMode === "map" ? "is-active" : ""}`}
                onClick={() => setViewMode("map")}
              >
                <MapIcon size={15} />
                Map
              </button>
            </div>
            <label className="rental-sort">
              <span>Sort by</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                {userCoords && <option value="distance">Distance: closest first</option>}
                <option value="default">Recommended</option>
                <option value="price_low">Price: low to high</option>
                <option value="price_high">Price: high to low</option>
                <option value="availability">Most rooms available</option>
              </select>
            </label>
          </div>
        </div>

        {favoriteError && <p className="rental-alert" role="alert">{favoriteError}</p>}
        {loading && <div className="rental-state" role="status">Loading rooms…</div>}
        {error && <div className="rental-state rental-alert" role="alert">{error}</div>}
        {!loading && !error && rooms.length === 0 && (
          <div className="rental-state">
            <strong>No matching rooms found</strong>
            <p>Try another location or adjust your filters.</p>
            <button type="button" onClick={resetFilters}>Clear filters</button>
          </div>
        )}

        {!loading && !error && rooms.length > 0 && (
          viewMode === "map" ? (
            <RoomMap rooms={sortedRooms} userCoords={userCoords} onViewDetails={handleViewDetails} />
          ) : (
            <div className="rental-card-grid">
              {sortedRooms.map((room) => {
                const isSaved = favoriteIds.includes(room.id);
                const available = Number(room.available_rooms) > 0;
                const isDemo = isDemoRoom(room);
                const cleanTitle = getCleanTitle(room.title);
                // UI CHANGE: safe handling of either a relative image path or an absolute URL.
                const imagePath = room.images?.[0];
                const imageUrl = typeof imagePath === "string"
                  ? imagePath.startsWith("http") ? imagePath : `${API_URL}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`
                  : null;
                return (
                  <article
                    className="rental-card"
                    key={room.id}
                    onClick={(e) => {
                      // Don't fire if clicking the heart button
                      if (e.target.closest(".rental-heart-btn")) return;
                      handleViewDetails(e, room);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="rental-card-media">
                      {imageUrl ? (
                        <img src={imageUrl} alt={cleanTitle} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("rental-hidden"); }} />
                      ) : null}
                      <div className={`rental-card-placeholder ${imageUrl ? "rental-hidden" : ""}`}>
                        <ImageIcon size={32} strokeWidth={1.5} />
                        <span>Photo coming soon</span>
                      </div>
                      <span className={`rental-availability ${available ? "is-available" : "is-full"}`}>
                        {available ? `${room.available_rooms} available` : "Fully occupied"}
                      </span>
                      {isDemo && (
                        <span className="rental-demo-badge">
                          <Sparkles size={10} /> Demo
                        </span>
                      )}
                      {room.distance_km !== undefined && room.distance_km !== null && (
                        <span className="rental-distance-badge">
                          <MapPin size={11} />
                          {room.distance_km < 1 ? `${Math.round(room.distance_km * 1000)} m` : `${room.distance_km} km`}
                        </span>
                      )}
                      <button
                        className={`rental-heart-btn ${isSaved ? "is-saved" : ""}`}
                        type="button"
                        aria-label={sessionStorage.getItem("access_token") ? "Favorites are for students" : isSaved ? `Remove ${cleanTitle} from saved rooms` : `Save ${cleanTitle}`}
                        title={sessionStorage.getItem("access_token") ? "You are signed in as a Property Owner. Favorites is a student feature." : undefined}
                        aria-pressed={isSaved}
                        disabled={favoriteLoadingId !== null}
                        onClick={() => handleFavorite(room.id)}
                      >
                        <Heart
                          size={18}
                          fill={isSaved ? "#e11d48" : "none"}
                          color={isSaved ? "#e11d48" : "#475569"}
                          strokeWidth={isSaved ? 0 : 2}
                        />
                      </button>
                    </div>
                    <div className="rental-card-body">
                      <div className="rental-card-category">{room.property_type || "Rental property"} <span>·</span> {room.room_type || "Room"}</div>
                      <h3>{cleanTitle}</h3>
                      <p className="rental-card-location">
                        <MapPin size={13} className="location-pin-icon" />
                        <span className="location-name">{room.location || "Location not specified"}</span>
                        {room.distance_km !== undefined && room.distance_km !== null && (
                          <span className="rental-distance-text">
                            • {room.distance_km < 1 ? `${Math.round(room.distance_km * 1000)}m away` : `${room.distance_km} km away`}
                          </span>
                        )}
                      </p>
                      <div className="rental-amenities">
                        {room.wifi && <span className="amenity-chip"><Check size={11} /> Wi-Fi</span>}
                        {room.furnished && <span className="amenity-chip"><Check size={11} /> Furnished</span>}
                        {room.attached_bathroom && <span className="amenity-chip"><Check size={11} /> Attached bath</span>}
                        {!room.wifi && !room.furnished && !room.attached_bathroom && (
                          <span className="amenity-chip-muted">Standard amenities</span>
                        )}
                      </div>
                      <div className="rental-card-bottom">
                        <div className="rental-price">₹{Number(room.rent).toLocaleString("en-IN")}<span>/month</span></div>
                        <button
                          type="button"
                          className="rental-details-link"
                          onClick={(e) => handleViewDetails(e, room)}
                        >
                          View details <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )
        )}
      </section>
    </main>
  );
}

export default Home;
