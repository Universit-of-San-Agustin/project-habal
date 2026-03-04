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
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);

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

  // Update pickup marker
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

  // Update dropoff marker
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

  return <div ref={containerRef} className={className} />;
}