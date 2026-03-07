import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function CityMap() {
  const mapContainer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
  container: mapContainer.current,
  style: "mapbox://styles/mapbox/dark-v11",
  center: [76.9558, 11.0168],
  zoom: 13,
  pitch: 0,
  bearing: 0,
  antialias: true
});

    map.on("load", () => {

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

      // ===== TRAFFIC ROADS (REAL MAPBOX ROADS) =====
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

    });

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