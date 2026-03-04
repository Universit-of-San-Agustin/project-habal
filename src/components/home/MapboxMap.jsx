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
  riderMarker,   // { lat, lng } - updates smoothly
  followRider = false,  // if true, map pans to rider on every update
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const prevRiderPos = useRef(null);

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

  // Rider marker — smooth real-time GPS updates
  useEffect(() => {
    if (!mapRef.current) return;

    if (!riderMarker) {
      if (riderMarkerRef.current) { riderMarkerRef.current.remove(); riderMarkerRef.current = null; }
      prevRiderPos.current = null;
      return;
    }

    const lngLat = [riderMarker.lng, riderMarker.lat];

    if (riderMarkerRef.current) {
      // Smoothly animate the existing marker to the new position
      riderMarkerRef.current.setLngLat(lngLat);
    } else {
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="
          width:40px;height:40px;border-radius:50%;
          background:linear-gradient(135deg,#10b981,#059669);
          border:3px solid white;
          box-shadow:0 4px 14px rgba(16,185,129,0.55);
          display:flex;align-items:center;justify-content:center;
          font-size:18px;
          transition:transform 0.3s ease;
        ">🏍</div>
        <div style="
          position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);
          width:10px;height:10px;border-radius:50%;
          background:rgba(16,185,129,0.25);
          animation:ping 1.4s cubic-bezier(0,0,0.2,1) infinite;
        "></div>
      `;
      riderMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat(lngLat)
        .setPopup(new mapboxgl.Popup({ offset: 28, closeButton: false }).setHTML("<strong style='font-size:12px'>Your Rider</strong>"))
        .addTo(mapRef.current);
    }

    if (followRider) {
      mapRef.current.easeTo({ center: lngLat, duration: 1000 });
    } else if (!prevRiderPos.current) {
      // First time, fly to rider
      mapRef.current.flyTo({ center: lngLat, zoom: 15, duration: 800 });
    }

    prevRiderPos.current = lngLat;
  }, [riderMarker, followRider]);

  return (
    <>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: translateX(-50%) scale(2.5); opacity: 0; }
        }
      `}</style>
      <div ref={containerRef} className={className} />
    </>
  );
}