import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import {
  getCityInfo,
  getPollution,
  getSimulationTick,
  getWeather,
  startSimulation,
  type BlockedRoadFeature,
} from "../../api/metromindApi";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface CityMapProps {
  isBlockModeArmed: boolean;
  blockedRoad: BlockedRoadFeature | null;
  onRoadBlocked: (road: BlockedRoadFeature | null) => void;
}

function getBlockedRoadCollection(
  blockedRoad: BlockedRoadFeature | null,
): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: blockedRoad ? [blockedRoad] : [],
  };
}

function CityMap({
  isBlockModeArmed,
  blockedRoad,
  onRoadBlocked,
}: CityMapProps) {

  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const simulationStarted = useRef(false);
  const simulationTickIntervalRef = useRef<number | null>(null);
  const environmentIntervalRef = useRef<number | null>(null);
  const isRequestInFlight = useRef(false);
  const blockModeArmedRef = useRef(isBlockModeArmed);
  const onRoadBlockedRef = useRef(onRoadBlocked);

  function updateBlockedRoadSource(road: BlockedRoadFeature | null) {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const source = map.getSource("blocked-road") as mapboxgl.GeoJSONSource | undefined;

    if (source) {
      source.setData(getBlockedRoadCollection(road));
    }
  }

  useEffect(() => {
    blockModeArmedRef.current = isBlockModeArmed;
  }, [isBlockModeArmed]);

  useEffect(() => {
    onRoadBlockedRef.current = onRoadBlocked;
  }, [onRoadBlocked]);

  useEffect(() => {

    if (!mapContainer.current) return;

    async function initMap() {

      const city = await getCityInfo();

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
      map.getCanvas().style.cursor = blockModeArmedRef.current ? "crosshair" : "";

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      // ===============================
      // CLICK ROAD TO START SIMULATION
      // ===============================

      map.on("click", async (e) => {

        if (!blockModeArmedRef.current || simulationStarted.current || isRequestInFlight.current) {
          return;
        }

        const lat = e.lngLat.lat;
        const lon = e.lngLat.lng;

        try {

          isRequestInFlight.current = true;

          const response = await startSimulation(lat, lon);

          simulationStarted.current = true;
          onRoadBlockedRef.current(response.blocked_road ?? null);
          updateBlockedRoadSource(response.blocked_road ?? null);

          console.log("Simulation started at:", lat, lon);

        } catch (err) {

          console.error("Simulation start failed", err);

        } finally {

          isRequestInFlight.current = false;

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
        }, labelLayerId);

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

        map.addSource("blocked-road", {
          type: "geojson",
          data: getBlockedRoadCollection(blockedRoad)
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
        }, labelLayerId);

        map.addLayer({
          id: "blocked-road-glow",
          type: "line",
          source: "blocked-road",
          layout: {
            "line-cap": "round",
            "line-join": "round"
          },
          paint: {
            "line-color": "#7f1d1d",
            "line-width": 16,
            "line-opacity": 0.45
          }
        }, labelLayerId);

        map.addLayer({
          id: "blocked-road-line",
          type: "line",
          source: "blocked-road",
          layout: {
            "line-cap": "round",
            "line-join": "round"
          },
          paint: {
            "line-color": "#f97316",
            "line-width": 8,
            "line-dasharray": [0.6, 1.2],
            "line-opacity": 0.95
          }
        }, labelLayerId);

        updateBlockedRoadSource(blockedRoad);

        // ===============================
        // WEATHER + POLLUTION FETCH
        // ===============================

        async function refreshEnvironmentData() {

          try {

            await getWeather();
            await getPollution();

          } catch (err) {

            console.error("Env data fetch failed", err);

          }

        }

        refreshEnvironmentData();

  environmentIntervalRef.current = window.setInterval(refreshEnvironmentData, 300000);

        // ===============================
        // SIMULATION TICK
        // ===============================

        simulationTickIntervalRef.current = window.setInterval(async () => {

          try {

            const simData = await getSimulationTick();

            if (!simData?.vehicles) return;

            const features: Feature<Point>[] = simData.vehicles.map((vehicle) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [vehicle.lon, vehicle.lat]
              },
              properties: {
                id: vehicle.id
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

      if (environmentIntervalRef.current !== null) {
        window.clearInterval(environmentIntervalRef.current);
        environmentIntervalRef.current = null;
      }

      if (simulationTickIntervalRef.current !== null) {
        window.clearInterval(simulationTickIntervalRef.current);
        simulationTickIntervalRef.current = null;
      }

      mapRef.current?.remove();
      mapRef.current = null;

    };

  }, []);

  useEffect(() => {
    updateBlockedRoadSource(blockedRoad);
  }, [blockedRoad]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    map.getCanvas().style.cursor = isBlockModeArmed ? "crosshair" : "";
  }, [isBlockModeArmed]);

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