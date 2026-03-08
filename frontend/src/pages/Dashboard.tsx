import { useState } from "react";
import {
  startSimulation,
  type BlockImpactAnalysis,
  type BlockedRoadFeature,
  type MapSelectionPoint,
} from "../api/metromindApi";
import PollutionPanel from "../components/panels/PollutionPanel";
import WeatherPanel from "../components/panels/WeatherPanel";
import ImpactAnalysisPanel from "../components/panels/ImpactAnalysisPanel";
import SimulationControls from "../components/simulation/SimulationControls";
import CityMap from "../components/Map/CityMap";

type SelectionMode = "idle" | "start" | "end";

export default function Dashboard() {
  const [blockedRoad, setBlockedRoad] = useState<BlockedRoadFeature | null>(null);
  const [analysis, setAnalysis] = useState<BlockImpactAnalysis | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [analysisSelection, setAnalysisSelection] = useState<{
    title: string;
    feature: BlockedRoadFeature;
  } | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("idle");
  const [startPoint, setStartPoint] = useState<MapSelectionPoint | null>(null);
  const [endPoint, setEndPoint] = useState<MapSelectionPoint | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmitSelection() {
    if (!startPoint || !endPoint || blockedRoad || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await startSimulation(startPoint, endPoint);

      setBlockedRoad(response.blocked_road ?? null);
      setAnalysis(response.analysis ?? null);
      setAnalysisSelection(null);
      setStartPoint(null);
      setEndPoint(null);
      setSelectionMode("idle");
      setIsAnalysisOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="dashboard">

      <CityMap
        blockedRoad={blockedRoad}
        selectionMode={selectionMode}
        startPoint={startPoint}
        endPoint={endPoint}
        analysisSelection={analysisSelection?.feature ?? null}
        onSelectionPoint={(point, mode) => {
          if (mode === "start") {
            setStartPoint(point);
            return;
          }

          setEndPoint(point);
        }}
      />

      <div className="mapInfoPanel">

        <WeatherPanel />

        <PollutionPanel />

      </div>

      <div className="mapControlPanel">

        {analysis ? (
          <button
            type="button"
            className="analysisTrigger"
            onClick={() => {
              setIsAnalysisOpen(true);
              setAnalysisSelection(null);
            }}
          >
            <span className="analysisTrigger__badge">Analysis ready</span>
            <span className="analysisTrigger__title">View road-block impact</span>
            <span className="analysisTrigger__meta">
              {analysis.affected_trip_count} trips sampled
            </span>
          </button>
        ) : null}


        <SimulationControls
          hasBlockedRoad={blockedRoad !== null}
          selectionMode={selectionMode}
          startPoint={startPoint}
          endPoint={endPoint}
          isSubmitting={isSubmitting}
          onSelectMode={setSelectionMode}
          onSubmit={handleSubmitSelection}
        />

      </div>

      {analysis && isAnalysisOpen ? (
        <ImpactAnalysisPanel
          analysis={analysis}
          selectedTitle={analysisSelection?.title ?? null}
          onClose={() => setIsAnalysisOpen(false)}
          onSelectFeature={(selection) => setAnalysisSelection(selection)}
        />
      ) : null}

    </div>
  );
}