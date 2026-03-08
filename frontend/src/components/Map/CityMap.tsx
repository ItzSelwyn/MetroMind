import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Feature, FeatureCollection, LineString, MultiLineString, Point } from "geojson";
import {
  getCityInfo,
  getPollution,
  getSimulationTick,
  getWeather,
  type BlockedRoadFeature,
  type MapSelectionPoint,
} from "../../api/metromindApi";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface CityMapProps {
  blockedRoad: BlockedRoadFeature | null;
  selectionMode: "idle" | "start" | "end";
  startPoint: MapSelectionPoint | null;
  endPoint: MapSelectionPoint | null;
  analysisSelection: BlockedRoadFeature | null;
  onSelectionPoint: (point: MapSelectionPoint, mode: "start" | "end") => void;
}

function getBlockedRoadCollection(
  blockedRoad: BlockedRoadFeature | null,
): FeatureCollection<LineString | MultiLineString> {
  return {
    type: "FeatureCollection",
    features: blockedRoad ? [blockedRoad] : [],
  };
}

function getAnalysisSelectionCollection(
  feature: BlockedRoadFeature | null,
): FeatureCollection<LineString | MultiLineString> {
  return {
    type: "FeatureCollection",
    features: feature ? [feature] : [],
  };
}

function getSelectionPointCollection(
  startPoint: MapSelectionPoint | null,
  endPoint: MapSelectionPoint | null,
): FeatureCollection<Point> {
  const features: Feature<Point>[] = [];

  if (startPoint) {
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [startPoint.lon, startPoint.lat]
      },
      properties: {
        kind: "start"
      }
    });
  }

  if (endPoint) {
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [endPoint.lon, endPoint.lat]
      },
      properties: {
        kind: "end"
      }
    });
  }

  return {
    type: "FeatureCollection",
    features
  };
}

function getSelectionPreviewCollection(
  startPoint: MapSelectionPoint | null,
  endPoint: MapSelectionPoint | null,
): FeatureCollection<LineString> {
  if (!startPoint || !endPoint) {
    return {
      type: "FeatureCollection",
      features: []
    };
  }

  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [startPoint.lon, startPoint.lat],
          [endPoint.lon, endPoint.lat]
        ]
      },
      properties: {
        kind: "selection-preview"
      }
    }]
  };
}

function CityMap({
  blockedRoad,
  selectionMode,
  startPoint,
  endPoint,
  analysisSelection,
  onSelectionPoint,
}: CityMapProps) {

  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const simulationTickIntervalRef = useRef<number | null>(null);
  const environmentIntervalRef = useRef<number | null>(null);
  const selectionModeRef = useRef(selectionMode);
  const blockedRoadRef = useRef(blockedRoad);
  const onSelectionPointRef = useRef(onSelectionPoint);

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

  function updateAnalysisSelectionSource(feature: BlockedRoadFeature | null) {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const source = map.getSource("analysis-selection") as mapboxgl.GeoJSONSource | undefined;

    if (source) {
      source.setData(getAnalysisSelectionCollection(feature));
    }
  }

  function updateSelectionPointSource(
    currentStartPoint: MapSelectionPoint | null,
    currentEndPoint: MapSelectionPoint | null,
  ) {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const source = map.getSource("selection-points") as mapboxgl.GeoJSONSource | undefined;

    if (source) {
      source.setData(getSelectionPointCollection(currentStartPoint, currentEndPoint));
    }
  }

  function updateSelectionPreviewSource(
    currentStartPoint: MapSelectionPoint | null,
    currentEndPoint: MapSelectionPoint | null,
  ) {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const source = map.getSource("selection-preview") as mapboxgl.GeoJSONSource | undefined;

    if (source) {
      source.setData(getSelectionPreviewCollection(currentStartPoint, currentEndPoint));
    }
  }

  useEffect(() => {
    selectionModeRef.current = selectionMode;
  }, [selectionMode]);

  useEffect(() => {
    blockedRoadRef.current = blockedRoad;
  }, [blockedRoad]);

  useEffect(() => {
    onSelectionPointRef.current = onSelectionPoint;
  }, [onSelectionPoint]);

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
      map.getCanvas().style.cursor = selectionModeRef.current === "idle" ? "" : "crosshair";

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      // ===============================
      // CLICK ROAD TO START SIMULATION
      // ===============================

      map.on("click", (e) => {

        if (blockedRoadRef.current || selectionModeRef.current === "idle") {
          return;
        }

        onSelectionPointRef.current({
          lat: e.lngLat.lat,
          lon: e.lngLat.lng
        }, selectionModeRef.current);

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

        map.addSource("analysis-selection", {
          type: "geojson",
          data: getAnalysisSelectionCollection(analysisSelection)
        });

        map.addSource("selection-points", {
          type: "geojson",
          data: getSelectionPointCollection(startPoint, endPoint)
        });

        map.addSource("selection-preview", {
          type: "geojson",
          data: getSelectionPreviewCollection(startPoint, endPoint)
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

        map.addLayer({
          id: "analysis-selection-glow",
          type: "line",
          source: "analysis-selection",
          layout: {
            "line-cap": "round",
            "line-join": "round"
          },
          paint: {
            "line-color": "#38bdf8",
            "line-width": 18,
            "line-opacity": 0.22
          }
        }, labelLayerId);

        map.addLayer({
          id: "analysis-selection-line",
          type: "line",
          source: "analysis-selection",
          layout: {
            "line-cap": "round",
            "line-join": "round"
          },
          paint: {
            "line-color": [
              "match",
              ["get", "status"],
              "reroute", "#38bdf8",
              "hotspot-road", "#fb7185",
              "reused-road", "#facc15",
              "#38bdf8"
            ],
            "line-width": [
              "match",
              ["get", "status"],
              "reroute", 8,
              6
            ],
            "line-opacity": 0.95
          }
        }, labelLayerId);

        map.addLayer({
          id: "selection-preview-line",
          type: "line",
          source: "selection-preview",
          layout: {
            "line-cap": "round",
            "line-join": "round"
          },
          paint: {
            "line-color": "#a78bfa",
            "line-width": 4,
            "line-opacity": 0.75,
            "line-dasharray": [1, 1.2]
          }
        }, labelLayerId);

        map.addLayer({
          id: "selection-points-layer",
          type: "circle",
          source: "selection-points",
          paint: {
            "circle-radius": 7,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#e2e8f0",
            "circle-color": [
              "match",
              ["get", "kind"],
              "start", "#22c55e",
              "end", "#f97316",
              "#e2e8f0"
            ]
          }
        }, labelLayerId);

        updateBlockedRoadSource(blockedRoad);
        updateAnalysisSelectionSource(analysisSelection);
        updateSelectionPointSource(startPoint, endPoint);
        updateSelectionPreviewSource(startPoint, endPoint);

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
    updateSelectionPointSource(startPoint, endPoint);
    updateSelectionPreviewSource(startPoint, endPoint);
  }, [startPoint, endPoint]);

  useEffect(() => {
    updateAnalysisSelectionSource(analysisSelection);
  }, [analysisSelection]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    map.getCanvas().style.cursor = selectionMode === "idle" ? "" : "crosshair";
  }, [selectionMode]);

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