import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { FeatureCollection, Point } from "geojson";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const API_BASE = "http://127.0.0.1:8000";

function CityMap() {

  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const simulationStarted = useRef(false);

  useEffect(() => {

    if (!mapContainer.current) return;

    async function initMap() {

      const cityRes = await fetch(`${API_BASE}/city-info`);
      const city = await cityRes.json();

      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [city.coordinates.lon, city.coordinates.lat],
        zoom: city.zoom,
        pitch: 0,
        bearing: 0,
        antialias: true
      });

      mapRef.current = map;

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      // ===============================
      // CLICK ROAD TO START SIMULATION
      // ===============================

      map.on("click", async (e) => {

        if (simulationStarted.current) return;

        const lat = e.lngLat.lat;
        const lon = e.lngLat.lng;

        try {

          await fetch(`${API_BASE}/simulation/start`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              lat,
              lon
            })
          });

          simulationStarted.current = true;

          console.log("Simulation started at:", lat, lon);

        } catch (err) {

          console.error("Simulation start failed", err);

        }

      });

      map.on("load", () => {

        const layers = map.getStyle().layers;

        const labelLayerId = layers?.find(
          (layer: any) =>
            layer.type === "symbol" && layer.layout?.["text-field"]
        )?.id;

        // ===============================
        // 3D BUILDINGS
        // ===============================

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

        // ===============================
        // ROADS
        // ===============================

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

        // ===============================
        // VEHICLE SOURCE
        // ===============================

        map.addSource("vehicles", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: []
          }
        });

        // ===============================
        // VEHICLE LAYER
        // ===============================

        map.addLayer({
          id: "vehicles-layer",
          type: "circle",
          source: "vehicles",
          paint: {
            "circle-radius": 4,
            "circle-color": "#00ffff"
          }
        });

        // ===============================
        // WEATHER + POLLUTION FETCH
        // ===============================

        async function refreshEnvironmentData() {

          try {

            await fetch(`${API_BASE}/weather`);
            await fetch(`${API_BASE}/pollution`);

          } catch (err) {

            console.error("Env data fetch failed", err);

          }

        }

        refreshEnvironmentData();

        setInterval(refreshEnvironmentData, 300000);

        // ===============================
        // SIMULATION TICK
        // ===============================

        setInterval(async () => {

          try {

            const res = await fetch(`${API_BASE}/simulation/tick`);
            const simData = await res.json();

            if (!simData?.vehicles) return;

            const features = simData.vehicles.map((v: any) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [v.lon, v.lat]
              },
              properties: {
                id: v.id
              }
            }));

            const geojson: FeatureCollection<Point> = {
              type: "FeatureCollection",
              features
            };

            const source = map.getSource("vehicles") as mapboxgl.GeoJSONSource;

            if (source) source.setData(geojson);

          } catch (err) {

            console.error("Simulation tick failed", err);

          }

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