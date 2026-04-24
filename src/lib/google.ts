/// <reference types="google.maps" />
// Google Maps Platform configuration.
// Per user's choice (frontend, restricted by HTTP referrer), the key is stored in code.
// IMPORTANT: in Google Cloud Console, restrict this key by HTTP referrer to your
// preview + production origins, and limit it to: Maps JavaScript API, Places API,
// Geocoding API. Without restrictions, anyone can rack up your bill.
//
// Required APIs to enable in your Google Cloud project:
//   - Maps JavaScript API
//   - Places API
//   - Geocoding API

export const GOOGLE_MAPS_API_KEY = "AIzaSyAzzpVF-MfHGlCj2-UZhKllGtsivtCXuvU";

// Libraries the app needs loaded with the Maps script.
export const GOOGLE_MAPS_LIBRARIES = ["places", "geometry"] as const;

// "Silver" map style — desaturated, calm, matches the Zen / Sage aesthetic.
export const ZEN_SILVER_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f7f3" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5b6b5e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#dfe5dc" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dfe9d4" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b7d5f" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#f1efe6" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e8e4d4" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#d8d2bd" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfdfe5" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4f7080" }] },
];
