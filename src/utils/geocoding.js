// src/utils/geocoding.js

/**
 * Zwraca współrzędne geograficzne na podstawie adresu.
 * Używa Google Maps Geocoding API.
 * 
 * @param {string} address - Pełny adres (np. "ul. Prosta 1, 00-001 Warszawa")
 * @returns {Promise<{lat: number, lng: number} | {error: string, status: string}>}
 */
export async function geocodeAddress(address) {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { error: "Brak klucza API (REACT_APP_GOOGLE_MAPS_API_KEY)", status: "MISSING_KEY" };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng
      };
    } else {
      return { error: data.error_message || "Nie znaleziono", status: data.status };
    }
  } catch (error) {
    return { error: error.message, status: "NETWORK_ERROR" };
  }
}

/**
 * Formatuje dane firmy do pełnego stringa z adresem.
 * @param {Object} company - Obiekt reprezentujący firmę z bazy danych
 * @returns {string} Sformatowany adres
 */
export function formatAddressFromCompany(company) {
  if (!company) return "";
  const parts = [];
  if (company.street) parts.push(company.street);
  if (company.postal_code) parts.push(company.postal_code);
  if (company.city) parts.push(company.city);
  return parts.join(", ");
}
