import { useState } from "react";
import type { BlockedRoadFeature } from "../api/metromindApi";
import PollutionPanel from "../components/panels/PollutionPanel";
import WeatherPanel from "../components/panels/WeatherPanel";
import SimulationControls from "../components/simulation/SimulationControls";
import CityMap from "../components/Map/CityMap";

export default function Dashboard() {
  const [isBlockModeArmed, setIsBlockModeArmed] = useState(false);
  const [blockedRoad, setBlockedRoad] = useState<BlockedRoadFeature | null>(null);

  return (
    <div className="dashboard">

      <CityMap
        isBlockModeArmed={isBlockModeArmed}
        blockedRoad={blockedRoad}
        onRoadBlocked={(road) => {
          setBlockedRoad(road);
          setIsBlockModeArmed(false);
        }}
      />

      <div className="rightPanel">

        <WeatherPanel />

        <PollutionPanel />

        <SimulationControls
          isBlockModeArmed={isBlockModeArmed}
          hasBlockedRoad={blockedRoad !== null}
          onArmBlockMode={() => setIsBlockModeArmed(true)}
        />

      </div>

    </div>
  );
}