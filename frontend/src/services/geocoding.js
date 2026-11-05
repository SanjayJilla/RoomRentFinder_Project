/**
 * Geocoding service using OpenStreetMap's free Nominatim API.
 * Provides address autocomplete and coordinate lookup without API keys.
 */

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

/**
 * Searches for places matching the query string.
 * @param {string} query - The search text (e.g. "Madhapur, Hyderabad")
 * @param {AbortSignal} [signal] - Optional abort signal for cancelling in-flight requests
 * @returns {Promise<Array<{ displayName: string, lat: number, lon: number }>>}
 */
export async function searchAddress(query, signal) {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(
      query.trim()
    )}&limit=5&addressdetails=1`;

    const response = await fetch(url, {
      signal,
      headers: {
        "Accept-Language": "en",
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding HTTP error ${response.status}`);
    }

    const data = await response.json();

    return data.map((item) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }));
  } catch (err) {
    if (err.name === "AbortError") {
      return [];
    }
    console.error("Geocoding lookup failed:", err);
    return [];
  }
}

/**
 * Converts GPS coordinates into a human-readable address.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<string|null>}
 */
export async function reverseGeocode(lat, lon) {
  try {
    const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lon}`;
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "en",
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.display_name || null;
  } catch (err) {
    console.error("Reverse geocoding failed:", err);
    return null;
  }
}

