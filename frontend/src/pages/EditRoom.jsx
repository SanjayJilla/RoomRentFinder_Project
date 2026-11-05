import { useState, useEffect, useRef } from "react";
import { searchAddress } from "../services/geocoding";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  MapPin,
  Check,
  X,
  ArrowLeft,
  Loader2,
  Building2,
  FileText,
  AlertCircle,
  Armchair,
  Wifi,
  Bath,
  Utensils,
} from "lucide-react";
import { getCleanTitle } from "../utils/demoHelper";

function EditRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    location: "",
    rent: "",
    deposit: "",
    total_rooms: "",
    available_rooms: "",
    property_type: "PG",
    room_type: "Single",
    furnished: false,
    wifi: false,
    attached_bathroom: false,
    food_included: false,
    gender_preference: "Any",
    description: "",
    latitude: null,
    longitude: null,
  });

  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [hasSelectedLocation, setHasSelectedLocation] = useState(false);
  const suggestionsRef = useRef(null);

  // Load existing room details
  useEffect(() => {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    let active = true;

    axios
      .get(`${import.meta.env.VITE_API_URL}/owners/me/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        if (!active) return;
        const room = response.data.find((r) => r.id === Number(roomId));

        if (!room) {
          setError("Room not found or you don't have permission to edit it.");
          return;
        }

        setForm({
          title: getCleanTitle(room.title) || "",
          location: room.location || "",
          rent: room.rent ?? "",
          deposit: room.deposit ?? "",
          total_rooms: room.total_rooms ?? "",
          available_rooms: room.available_rooms ?? "",
          property_type: room.property_type || "PG",
          room_type: room.room_type || "Single",
          furnished: room.furnished ?? false,
          wifi: room.wifi ?? false,
          attached_bathroom: room.attached_bathroom ?? false,
          food_included: room.food_included ?? false,
          gender_preference: room.gender_preference || "Any",
          description: room.description || "",
          latitude: room.latitude ?? null,
          longitude: room.longitude ?? null,
        });

        if (room.latitude && room.longitude) {
          setHasSelectedLocation(true);
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 401) {
          sessionStorage.removeItem("access_token");
          navigate("/login", { replace: true });
        } else {
          setError("Unable to load property details.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [roomId, navigate]);

  // Geocoding Autocomplete
  useEffect(() => {
    if (!form.location || form.location.trim().length < 3 || hasSelectedLocation) {
      setLocationSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      const results = await searchAddress(form.location, controller.signal);
      setLocationSuggestions(results);
      setIsSearchingLocation(false);
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [form.location, hasSelectedLocation]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setLocationSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (suggestion) => {
    setForm((previous) => ({
      ...previous,
      location: suggestion.displayName,
      latitude: suggestion.lat,
      longitude: suggestion.lon,
    }));
    setHasSelectedLocation(true);
    setLocationSuggestions([]);
  };

  const handleLocationInputChange = (e) => {
    const value = e.target.value;
    setForm((previous) => ({
      ...previous,
      location: value,
      latitude: null,
      longitude: null,
    }));
    setHasSelectedLocation(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const rent = Number(form.rent);
    const deposit = form.deposit !== "" ? Number(form.deposit) : 0;
    const totalRooms = Number(form.total_rooms);
    const availableRooms = Number(form.available_rooms);

    if (rent <= 0) {
      setError("Monthly rent must be greater than zero.");
      return;
    }

    if (deposit < 0) {
      setError("Deposit cannot be negative.");
      return;
    }

    if (!Number.isInteger(totalRooms) || totalRooms < 1) {
      setError("Total rooms must be at least 1.");
      return;
    }

    if (!Number.isInteger(availableRooms) || availableRooms < 0) {
      setError("Available rooms cannot be negative.");
      return;
    }

    if (availableRooms > totalRooms) {
      setError("Available rooms cannot exceed total rooms.");
      return;
    }

    setSaving(true);

    try {
      const token = sessionStorage.getItem("access_token");

      if (!token) {
        navigate("/login");
        return;
      }

      const cleanBaseTitle = getCleanTitle(form.title);
      const finalTitle = cleanBaseTitle;

      const payload = {
        title: finalTitle,
        location: form.location.trim(),
        rent,
        deposit,
        total_rooms: totalRooms,
        available_rooms: availableRooms,
        property_type: form.property_type,
        room_type: form.room_type,
        furnished: Boolean(form.furnished),
        wifi: Boolean(form.wifi),
        attached_bathroom: Boolean(form.attached_bathroom),
        food_included: Boolean(form.food_included),
        gender_preference: form.gender_preference,
        description: form.description ? form.description.trim() : "",
      };

      if (
        form.latitude !== null &&
        form.longitude !== null &&
        !isNaN(Number(form.latitude)) &&
        !isNaN(Number(form.longitude))
      ) {
        payload.latitude = Number(form.latitude);
        payload.longitude = Number(form.longitude);
      }

      await axios.patch(
        `${import.meta.env.VITE_API_URL}/rooms/${roomId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      navigate("/owner/dashboard");
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to update property. Please check your details and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const amenities = [
    {
      name: "furnished",
      label: "Furnished",
      description: "Furniture is provided",
      icon: <Armchair size={18} />,
    },
    {
      name: "wifi",
      label: "Wi-Fi",
      description: "Internet access available",
      icon: <Wifi size={18} />,
    },
    {
      name: "attached_bathroom",
      label: "Attached Bathroom",
      description: "Private attached bathroom",
      icon: <Bath size={18} />,
    },
    {
      name: "food_included",
      label: "Food Included",
      description: "Meals are included in rent",
      icon: <Utensils size={18} />,
    },
  ];

  if (loading) {
    return (
      <div className="add-property-page">
        <div className="add-property-wrapper" style={{ textAlign: "center", padding: "60px 20px" }}>
          <Loader2 size={28} className="spin-icon" style={{ margin: "0 auto 12px", color: "#2563eb" }} />
          <p style={{ color: "#64748b" }}>Loading property details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="add-property-page">
      <div className="add-property-wrapper">
        <Link to="/owner/dashboard" className="add-property-back">
          <ArrowLeft size={15} style={{ marginRight: "6px" }} /> Back to Dashboard
        </Link>

        <header className="add-property-header">
          <span className="add-property-eyebrow">OWNER WORKSPACE</span>
          <h1>Edit Property</h1>
          <p>
            Update your property details, pricing, room availability, and amenities.
          </p>
        </header>

        <form className="add-property-form" onSubmit={handleSubmit}>
          {/* PROPERTY DETAILS */}
          <section className="add-property-section">
            <div className="add-property-section-heading">
              <span className="add-property-section-icon">
                <Building2 size={20} />
              </span>
              <div>
                <h2>Property Details</h2>
                <p>Edit your property title, address, and category.</p>
              </div>
            </div>

            <div className="add-property-field">
              <label htmlFor="property-title">Property Title</label>
              <input
                id="property-title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Spacious 1BHK Flat near Hitec City"
                required
                maxLength={120}
              />
            </div>

            {/* Location Autocomplete */}
            <div className="add-property-field">
              <label htmlFor="property-location">Property Location / Address</label>
              <div className="location-field-wrapper" ref={suggestionsRef}>
                <div className="location-input-container">
                  <input
                    id="property-location"
                    type="text"
                    value={form.location}
                    onChange={handleLocationInputChange}
                    placeholder="Search area, landmark or street address..."
                    required
                    autoComplete="off"
                  />
                  {isSearchingLocation && (
                    <span className="location-search-spinner" title="Searching places...">
                      <Loader2 size={14} className="spin-icon" />
                    </span>
                  )}
                </div>

                {form.latitude && form.longitude && (
                  <div className="location-coords-badge">
                    <Check size={13} className="coords-check-icon" />
                    <span>
                      GPS Coordinates linked ({Number(form.latitude).toFixed(4)},{" "}
                      {Number(form.longitude).toFixed(4)})
                    </span>
                    <button
                      type="button"
                      className="location-coords-clear"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, latitude: null, longitude: null }));
                        setHasSelectedLocation(false);
                      }}
                      title="Clear coordinates"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {locationSuggestions.length > 0 && (
                  <ul className="location-suggestions-dropdown">
                    {locationSuggestions.map((item, idx) => (
                      <li
                        key={idx}
                        className="location-suggestion-item"
                        onClick={() => handleSelectSuggestion(item)}
                      >
                        <MapPin size={13} className="location-pin-icon" />
                        <span className="location-suggestion-name">{item.displayName}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Property and Room Type */}
            <div className="add-property-grid-3">
              <div className="add-property-field">
                <label htmlFor="property-type">Property Type</label>
                <select
                  id="property-type"
                  name="property_type"
                  value={form.property_type}
                  onChange={handleChange}
                >
                  <option value="PG">Paying Guest (PG)</option>
                  <option value="Hostel">Hostel</option>
                  <option value="Flat">Apartment / Flat</option>
                  <option value="RK">1 RK Studio</option>
                </select>
              </div>

              <div className="add-property-field">
                <label htmlFor="property-room-type">Room Type</label>
                <select
                  id="property-room-type"
                  name="room_type"
                  value={form.room_type}
                  onChange={handleChange}
                >
                  <option value="Single">Single Room</option>
                  <option value="Double">Double Sharing</option>
                  <option value="Triple">Triple Sharing</option>
                  <option value="Four">Four Sharing</option>
                </select>
              </div>

              <div className="add-property-field">
                <label htmlFor="property-gender">Gender Preference</label>
                <select
                  id="property-gender"
                  name="gender_preference"
                  value={form.gender_preference}
                  onChange={handleChange}
                >
                  <option value="Any">Any / Co-ed</option>
                  <option value="Male">Boys / Male Only</option>
                  <option value="Female">Girls / Female Only</option>
                </select>
              </div>
            </div>
          </section>

          {/* CAPACITY & PRICING */}
          <section className="add-property-section">
            <div className="add-property-section-heading">
              <span className="add-property-section-icon">
                <Building2 size={20} />
              </span>
              <div>
                <h2>Capacity & Pricing</h2>
                <p>Update monthly rent, deposit, and vacancies.</p>
              </div>
            </div>

            <div className="add-property-grid-2">
              <div className="add-property-field">
                <label htmlFor="property-rent">Monthly Rent (₹)</label>
                <input
                  id="property-rent"
                  name="rent"
                  type="number"
                  min="1"
                  value={form.rent}
                  onChange={handleChange}
                  placeholder="e.g. 7500"
                  required
                />
              </div>

              <div className="add-property-field">
                <label htmlFor="property-deposit">Security Deposit (₹)</label>
                <input
                  id="property-deposit"
                  name="deposit"
                  type="number"
                  min="0"
                  value={form.deposit}
                  onChange={handleChange}
                  placeholder="e.g. 15000"
                />
              </div>
            </div>

            <div className="add-property-grid-2">
              <div className="add-property-field">
                <label htmlFor="property-total-rooms">Total Rooms in Property</label>
                <input
                  id="property-total-rooms"
                  name="total_rooms"
                  type="number"
                  min="1"
                  value={form.total_rooms}
                  onChange={handleChange}
                  placeholder="e.g. 5"
                  required
                />
              </div>

              <div className="add-property-field">
                <label htmlFor="property-available-rooms">Vacant / Available Rooms</label>
                <input
                  id="property-available-rooms"
                  name="available_rooms"
                  type="number"
                  min="0"
                  value={form.available_rooms}
                  onChange={handleChange}
                  placeholder="e.g. 2"
                  required
                />
              </div>
            </div>
          </section>

          {/* AMENITIES */}
          <section className="add-property-section">
            <div className="add-property-section-heading">
              <span className="add-property-section-icon">
                <Sparkles size={20} />
              </span>
              <div>
                <h2>Amenities</h2>
                <p>Select the facilities your property offers.</p>
              </div>
            </div>

            <div className="add-property-amenities">
              {amenities.map((amenity) => (
                <label
                  key={amenity.name}
                  className={`add-property-amenity ${
                    form[amenity.name] ? "selected" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    name={amenity.name}
                    checked={form[amenity.name]}
                    onChange={handleChange}
                  />

                  <span className="add-property-amenity-icon">{amenity.icon}</span>

                  <span className="add-property-amenity-text">
                    <strong>{amenity.label}</strong>
                    <small>{amenity.description}</small>
                  </span>

                  <span className="add-property-check">
                    <Check size={14} />
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* DESCRIPTION */}
          <section className="add-property-section">
            <div className="add-property-section-heading">
              <span className="add-property-section-icon">
                <FileText size={20} />
              </span>
              <div>
                <h2>About Your Property</h2>
                <p>Help students understand what makes it suitable.</p>
              </div>
            </div>

            <div className="add-property-field">
              <label htmlFor="property-description">Description</label>
              <textarea
                id="property-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe facilities, nearby colleges, transport, rules, or other useful details..."
                rows={5}
                maxLength={2000}
              />

              <span className="add-property-character-count">
                {form.description.length}/2000 characters
              </span>
            </div>
          </section>

          {/* ERROR ALERT */}
          {error && (
            <div className="add-property-error" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <p>{error}</p>
            </div>
          )}

          {/* ACTIONS */}
          <div className="add-property-actions">
            <button
              type="button"
              className="add-property-cancel"
              onClick={() => navigate("/owner/dashboard")}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="add-property-submit"
              disabled={saving}
            >
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditRoom;
