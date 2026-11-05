import { useEffect, useRef, useState } from "react";
import { isDemoRoom, getCleanTitle } from "../utils/demoHelper";
import { MapPin, RotateCcw, Maximize2, Minimize2 } from "lucide-react";

const API_URL = `${import.meta.env.VITE_API_URL}`;

function RoomMap({ rooms = [], userCoords = null, onViewDetails = null }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const boundsRef = useRef([]);
  const [leafletReady, setLeafletReady] = useState(typeof window !== "undefined" && !!window.L);
  const [expanded, setExpanded] = useState(false);

  // Poll briefly for window.L if the CDN script is still downloading
  useEffect(() => {
    if (leafletReady) return;
    const interval = setInterval(() => {
      if (window.L) {
        setLeafletReady(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [leafletReady]);

  // Initialize Leaflet Map with CartoDB Voyager tiles (clean, modern SaaS aesthetic)
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = window.L;

    // Default center (Hyderabad or fallback)
    const initialCenter = userCoords
      ? [userCoords.lat, userCoords.lng]
      : [17.44, 78.38];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 12,
      scrollWheelZoom: true,
      zoomControl: false, // We'll reposition zoom control cleanly in top-right
    });

    // Standard free OpenStreetMap basemap (100% free, no API key required)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(map);

    // Add zoom control in top-right with custom styling
    L.control.zoom({ position: "topright" }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersGroupRef.current = markersGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersGroupRef.current = null;
    };
  }, [leafletReady]);

  // Invalidate map size when toggling expanded view
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 250);
    }
  }, [expanded]);

  // Handle popup "View Details" button click via delegation
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const handlePopupClick = (e) => {
      const btn = e.target.closest(".map-popup-link");
      if (btn) {
        e.preventDefault();
        const roomId = btn.getAttribute("data-room-id");
        if (roomId && onViewDetails) {
          const matched = rooms.find((r) => String(r.id) === String(roomId));
          if (matched) {
            onViewDetails(e, matched);
          }
        }
      }
    };

    container.addEventListener("click", handlePopupClick);
    return () => container.removeEventListener("click", handlePopupClick);
  }, [rooms, onViewDetails]);

  // Update Markers when rooms or userCoords change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current || !window.L) return;

    const L = window.L;
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;

    markersGroup.clearLayers();
    const bounds = [];

    // Add User "You are here" marker if geolocation active
    if (userCoords && userCoords.lat && userCoords.lng) {
      const userIcon = L.divIcon({
        className: "user-map-pin-container",
        html: `<div class="user-pulse-ring"></div><div class="user-marker-dot"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const userMarker = L.marker([userCoords.lat, userCoords.lng], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).bindPopup(
        `<div class="map-user-popup">
          <strong>Your Current Location</strong>
          <p>Showing rentals near you</p>
        </div>`
      );

      markersGroup.addLayer(userMarker);
      bounds.push([userCoords.lat, userCoords.lng]);
    }

    // Add Room Markers
    const roomsWithCoords = rooms.filter(
      (r) => typeof r.latitude === "number" && typeof r.longitude === "number"
    );

    roomsWithCoords.forEach((room) => {
      const priceText = `₹${Number(room.rent).toLocaleString("en-IN")}`;
      const distanceBadge =
        room.distance_km !== undefined && room.distance_km !== null
          ? `<span class="map-popup-distance">${
              room.distance_km < 1
                ? `${Math.round(room.distance_km * 1000)} m`
                : `${room.distance_km} km`
            } away</span>`
          : "";

      const imagePath = room.images?.[0];
      const imageUrl =
        typeof imagePath === "string"
          ? imagePath.startsWith("http")
            ? imagePath
            : `${API_URL}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`
          : "";

      const isDemo = isDemoRoom(room);
      const cleanTitle = getCleanTitle(room.title);

      // Modern Airbnb-style pill marker with a stem pointing to the building
      const customIcon = L.divIcon({
        className: "room-map-bubble-marker",
        html: `
          <div class="room-bubble-wrapper${isDemo ? " is-demo" : ""}">
            <div class="room-bubble-badge">
              ${isDemo ? '<span class="room-bubble-sparkle-dot"></span>' : ""}
              <span class="room-bubble-amount">${priceText}</span>
            </div>
            <div class="room-bubble-pointer"></div>
          </div>
        `,
        iconSize: [80, 36],
        iconAnchor: [40, 36],
      });

      const popupContent = `
        <div class="map-room-popup">
          <div class="map-popup-media">
            ${
              imageUrl
                ? `<img src="${imageUrl}" alt="${cleanTitle}" />`
                : `<div class="map-popup-no-media"><span>Photo coming soon</span></div>`
            }
            <div class="map-popup-floating-tags">
              <span class="map-popup-type-chip">${room.property_type || "Rental"} · ${room.room_type || "Room"}</span>
              ${isDemo ? '<span class="map-popup-demo-chip">DEMO</span>' : ''}
            </div>
          </div>
          <div class="map-popup-body">
            <h4 class="map-popup-title" title="${cleanTitle}">${cleanTitle}</h4>
            <p class="map-popup-location"><span class="map-pin-emoji">📍</span> ${room.location || "Location not specified"}</p>
            ${distanceBadge}
            <div class="map-popup-footer">
              <div class="map-popup-price-wrap">
                <strong class="map-popup-price">${priceText}</strong>
                <span class="map-popup-period">/month</span>
              </div>
              <button type="button" class="map-popup-link map-popup-btn" data-room-id="${room.id}">
                View Details →
              </button>
            </div>
          </div>
        </div>
      `;

      const marker = L.marker([room.latitude, room.longitude], {
        icon: customIcon,
      }).bindPopup(popupContent, {
        maxWidth: 250,
        className: "room-leaflet-popup",
        closeButton: true,
      });

      markersGroup.addLayer(marker);
      bounds.push([room.latitude, room.longitude]);
    });

    boundsRef.current = bounds;

    // Auto-fit bounds so all markers are visible
    if (bounds.length > 0) {
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15,
      });
    }
  }, [rooms, userCoords, leafletReady]);

  const handleResetBounds = () => {
    if (!mapInstanceRef.current || boundsRef.current.length === 0) return;
    mapInstanceRef.current.fitBounds(boundsRef.current, {
      padding: [50, 50],
      maxZoom: 15,
    });
  };

  const mappedCount = rooms.filter(
    (r) => typeof r.latitude === "number" && typeof r.longitude === "number"
  ).length;

  return (
    <div className={`room-map-wrapper ${expanded ? "is-expanded" : ""}`}>
      <div className="room-map-toolbar">
        <div className="room-map-status">
          <span className="room-map-pill">
            <MapPin size={13} className="room-map-pin-icon" />
            <strong>{mappedCount}</strong> of {rooms.length} places mapped
          </span>
          {mappedCount < rooms.length && (
            <span className="room-map-notice">
              ({rooms.length - mappedCount} without GPS coordinates)
            </span>
          )}
        </div>

        <div className="room-map-controls">
          {boundsRef.current.length > 0 && (
            <button
              type="button"
              className="room-map-tool-btn"
              onClick={handleResetBounds}
              title="Fit all markers in view"
            >
              <RotateCcw size={13} />
              <span>Fit All</span>
            </button>
          )}
          <button
            type="button"
            className="room-map-tool-btn"
            onClick={() => setExpanded((prev) => !prev)}
            title={expanded ? "Standard height" : "Expand map"}
          >
            {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{expanded ? "Standard" : "Expand"}</span>
          </button>
        </div>
      </div>

      <div
        ref={mapContainerRef}
        className="room-leaflet-container"
        style={{
          width: "100%",
          height: expanded ? "700px" : "520px",
          transition: "height 0.25s ease",
        }}
      />
    </div>
  );
}

export default RoomMap;

