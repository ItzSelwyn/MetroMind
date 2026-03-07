import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { FeatureCollection, Point } from "geojson";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const API_BASE = "http://127.0.0.1:8000";

function CityMap() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    async function initMap() {
      // ===== GET CITY INFO FROM BACKEND =====
      const cityRes = await fetch(`${API_BASE}/city-info`);
      const city = await cityRes.json();

      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [city.coordinates.lon, city.coordinates.lat],
        zoom: city.zoom,
        pitch: 60,
        bearing: -20,
        antialias: true
      });

      mapRef.current = map;

      map.on("load", async () => {

        // ===== 3D BUILDINGS =====
        const layers = map.getStyle().layers;

        const labelLayerId = layers?.find(
          (layer: any) =>
            layer.type === "symbol" && layer.layout?.["text-field"]
        )?.id;

        map.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 15,
            paint: {
              "fill-extrusion-color": "#aaa",
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "min_height"],
              "fill-extrusion-opacity": 0.6
            }
          },
          labelLayerId
        );

        // ===== TRAFFIC ROADS =====
        map.addLayer({
          id: "traffic-roads",
          type: "line",
          source: "composite",
          "source-layer": "road",
          layout: {
            "line-cap": "round",
            "line-join": "round"
          },
          paint: {
            "line-width": 4,
            "line-color": [
              "match",
              ["get", "class"],
              "motorway", "#ff0000",
              "primary", "#ffff00",
              "secondary", "#00ff00",
              "#555"
            ]
          }
        });

        // ===== POLLUTION MARKER =====
        const pollutionRes = await fetch(`${API_BASE}/pollution`);
        const pollution = await pollutionRes.json();

        const pollutionMarker = new mapboxgl.Marker({ color: "orange" })
          .setLngLat([
            pollution.coordinates.lon,
            pollution.coordinates.lat
          ])
          .setPopup(
            new mapboxgl.Popup().setHTML(`
              <h3>Pollution</h3>
              <p>AQI: ${pollution.aqi}</p>
              <p>Status: ${pollution.aqi_label}</p>
              <p>PM2.5: ${pollution.components.pm2_5}</p>
            `)
          )
          .addTo(map);

        // ===== WIND MARKER =====
        const weatherRes = await fetch(`${API_BASE}/weather`);
        const weather = await weatherRes.json();

        const windEl = document.createElement("div");
        windEl.innerHTML = "🡹";
        windEl.style.fontSize = "28px";
        windEl.style.transform = `rotate(${weather.wind.direction}deg)`;

        const windMarker = new mapboxgl.Marker(windEl)
          .setLngLat([
            weather.coordinates.lon,
            weather.coordinates.lat
          ])
          .setPopup(
            new mapboxgl.Popup().setHTML(`
              <h3>Weather</h3>
              <p>Temp: ${weather.weather.temperature}°C</p>
              <p>Humidity: ${weather.weather.humidity}%</p>
              <p>Wind Speed: ${weather.wind.speed} m/s</p>
            `)
          )
          .addTo(map);

        // ===== VEHICLE SOURCE =====
        map.addSource("vehicles", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: []
          }
        });

        // ===== VEHICLE LAYER =====
        map.addLayer({
          id: "vehicles-layer",
          type: "circle",
          source: "vehicles",
          paint: {
            "circle-radius": 5,
            "circle-color": "#00ffff"
          }
        });

        // ===== LIVE DATA REFRESH =====
        setInterval(async () => {

          const pollutionRes = await fetch(`${API_BASE}/pollution`);
          const pollution = await pollutionRes.json();

          pollutionMarker.setPopup(
            new mapboxgl.Popup().setHTML(`
              <h3>Pollution</h3>
              <p>AQI: ${pollution.aqi}</p>
              <p>Status: ${pollution.aqi_label}</p>
              <p>PM2.5: ${pollution.components.pm2_5}</p>
            `)
          );

          const weatherRes = await fetch(`${API_BASE}/weather`);
          const weather = await weatherRes.json();

          windEl.style.transform = `rotate(${weather.wind.direction}deg)`;

        }, 5000);

        // ===== SIMULATION TICK =====
        setInterval(async () => {

          const res = await fetch(`${API_BASE}/simulation/tick`);
          const simData = await res.json();

          if (!simData || !simData.vehicles) return;

          const features = simData.vehicles.map((v: any) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [v.lon, v.lat]
            },
            properties: {
              id: v.id
            }
          })) as any;

          const geojson: FeatureCollection<Point> = {
            type: "FeatureCollection",
            features
          };

          const source = map.getSource("vehicles") as mapboxgl.GeoJSONSource;
          source.setData(geojson);

        }, 1000);

      });
    }

    initMap();

    return () => {
      mapRef.current?.remove();
    };

  }, []);

  return (
    <div
      ref={mapContainer}
      style={{
        width: "100%",
        height: "100vh"
      }}
    />
  );
}

export default CityMap;