interface SimulationControlsProps {
  isBlockModeArmed: boolean;
  hasBlockedRoad: boolean;
  onArmBlockMode: () => void;
}

export default function SimulationControls({
  isBlockModeArmed,
  hasBlockedRoad,
  onArmBlockMode,
}: SimulationControlsProps) {
  const buttonLabel = hasBlockedRoad
    ? "Road blocked"
    : isBlockModeArmed
      ? "Select a road on the map"
      : "Block a road";

  const helperText = hasBlockedRoad
    ? "The selected road is blocked and vehicles are now spawning near the closure."
    : isBlockModeArmed
      ? "Click the road segment you want to block."
      : "Arm road-block mode, then click a road on the map.";

  return (
    <div className="simulationControls">
      <div className="simulationControls__header">
        <h3>Simulation Control</h3>
        <span className={`simulationControls__status simulationControls__status--${hasBlockedRoad ? "blocked" : isBlockModeArmed ? "armed" : "idle"}`}>
          {hasBlockedRoad ? "Blocked" : isBlockModeArmed ? "Armed" : "Idle"}
        </span>
      </div>

      <p>{helperText}</p>

      <button
        type="button"
        className="simulationControls__button"
        onClick={onArmBlockMode}
        disabled={hasBlockedRoad || isBlockModeArmed}
      >
        {buttonLabel}
      </button>
    </div>
  );
}