// src/utils/geocoding.js

/**
 * Zwraca współrzędne geograficzne na podstawie adresu.
 * Używa Google Maps Geocoding API.
 * 
 * @param {string} address - Pełny adres (np. "ul. Prosta 1, 00-001 Warszawa")
 * @returns {Promise<{lat: number, lng: number} | null>} Obiekt ze współrzędnymi lub null, jeśli nie znaleziono.
 */
export async function geocodeAddress(address) {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("Brak klucza API Google Maps (REACT_APP_GOOGLE_MAPS_API_KEY).");
    return null;
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
      console.warn(`Geokodowanie nie powiodło się dla adresu: ${address}. Status: ${data.status}`);
      return null;
    }
  } catch (error) {
    console.error("Błąd podczas geokodowania:", error);
    return null;
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
