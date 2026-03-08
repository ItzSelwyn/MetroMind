import type { MapSelectionPoint } from "../../api/metromindApi";

interface SimulationControlsProps {
  hasBlockedRoad: boolean;
  selectionMode: "idle" | "start" | "end";
  startPoint: MapSelectionPoint | null;
  endPoint: MapSelectionPoint | null;
  isSubmitting: boolean;
  onSelectMode: (mode: "idle" | "start" | "end") => void;
  onSubmit: () => void;
}

export default function SimulationControls({
  hasBlockedRoad,
  selectionMode,
  startPoint,
  endPoint,
  isSubmitting,
  onSelectMode,
  onSubmit,
}: SimulationControlsProps) {
  const helperText = hasBlockedRoad
    ? "The selected road corridor is blocked and vehicles are now spawning near the closure."
    : selectionMode === "start"
      ? "Click on the map to choose or adjust the start of the blocked road."
      : selectionMode === "end"
        ? "Click on the map to choose or adjust the end of the blocked road."
        : "Choose Start and End on the map, then submit the block.";

  const canSubmit = startPoint !== null && endPoint !== null && !hasBlockedRoad && !isSubmitting;

  function formatPointLabel(label: string, point: MapSelectionPoint | null) {
    if (!point) {
      return `${label}: not selected`;
    }

    return `${label}: ${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`;
  }

  return (
    <div className="simulationControls">
      <div className="simulationControls__header">
        <h3>Simulation Control</h3>
        <span className={`simulationControls__status simulationControls__status--${hasBlockedRoad ? "blocked" : selectionMode !== "idle" ? "armed" : "idle"}`}>
          {hasBlockedRoad ? "Blocked" : selectionMode !== "idle" ? selectionMode : "Idle"}
        </span>
      </div>

      <p>{helperText}</p>

      <div className="simulationControls__selectionSummary">
        <span>{formatPointLabel("Start", startPoint)}</span>
        <span>{formatPointLabel("End", endPoint)}</span>
      </div>

      <div className="simulationControls__actions">
        <button
          type="button"
          className={`simulationControls__secondaryButton${selectionMode === "start" ? " simulationControls__secondaryButton--active" : ""}`}
          onClick={() => onSelectMode("start")}
          disabled={hasBlockedRoad || isSubmitting}
        >
          Start
        </button>

        <button
          type="button"
          className={`simulationControls__secondaryButton${selectionMode === "end" ? " simulationControls__secondaryButton--active" : ""}`}
          onClick={() => onSelectMode("end")}
          disabled={hasBlockedRoad || isSubmitting}
        >
          End
        </button>

        <button
          type="button"
          className="simulationControls__button"
          onClick={onSubmit}
          disabled={!canSubmit}
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}