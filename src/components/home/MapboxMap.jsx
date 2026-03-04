import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = "pk.eyJ1IjoieWlrMzQzMDAiLCJhIjoiY21seWd1ZnlpMHl6MTNnc2dkbjcwZ2NmZCJ9.RRkFfU-zgGip8mt8af3MWg";

export default function MapboxMap({
  center = [122.5654, 10.7202],
  zoom = 14,
  className = "",
  onGeolocate,
  pickupMarker,
  dropoffMarker,
  riderMarker,   // { lat, lng, heading }
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const riderMarkerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center,
      zoom,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    if (onGeolocate) {
      const geoCtrl = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserLocation: true,
        showAccuracyCircle: true,
      });
      map.addControl(geoCtrl, "top-right");
      geoCtrl.on("geolocate", (e) => {
        onGeolocate(e.coords.longitude, e.coords.latitude);
      });
      map.on("load", () => geoCtrl.trigger());
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Pickup marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (pickupMarkerRef.current) { pickupMarkerRef.current.remove(); pickupMarkerRef.current = null; }
    if (pickupMarker) {
      const el = document.createElement("div");
      el.style.cssText = "width:18px;height:18px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 0 0 4px rgba(34,197,94,0.25);";
      pickupMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([pickupMarker.lng, pickupMarker.lat])
        .addTo(mapRef.current);
    }
  }, [pickupMarker]);

  // Dropoff marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (dropoffMarkerRef.current) { dropoffMarkerRef.current.remove(); dropoffMarkerRef.current = null; }
    if (dropoffMarker) {
      const el = document.createElement("div");
      el.style.cssText = "width:18px;height:18px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 0 0 4px rgba(249,115,22,0.25);";
      dropoffMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([dropoffMarker.lng, dropoffMarker.lat])
        .addTo(mapRef.current);
      mapRef.current.flyTo({ center: [dropoffMarker.lng, dropoffMarker.lat], zoom: 14, duration: 600 });
    }
  }, [dropoffMarker]);

  // Rider marker (live GPS)
  useEffect(() => {
    if (!mapRef.current) return;
    if (!riderMarker) {
      if (riderMarkerRef.current) { riderMarkerRef.current.remove(); riderMarkerRef.current = null; }
      return;
    }
    if (riderMarkerRef.current) {
      riderMarkerRef.current.setLngLat([riderMarker.lng, riderMarker.lat]);
    } else {
      const el = document.createElement("div");
      el.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:#10b981;border:3px solid white;box-shadow:0 4px 12px rgba(16,185,129,0.5);display:flex;align-items:center;justify-content:center;font-size:16px;">🏍</div>`;
      riderMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([riderMarker.lng, riderMarker.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML("<strong>Your Rider</strong>"))
        .addTo(mapRef.current);
    }
    mapRef.current.easeTo({ center: [riderMarker.lng, riderMarker.lat], duration: 800 });
  }, [riderMarker]);

  return <div ref={containerRef} className={className} />;
}