import PollutionPanel from "../components/panels/PollutionPanel";
import WeatherPanel from "../components/panels/WeatherPanel";
import SimulationControls from "../components/simulation/SimulationControls";
import CityMap from "../components/Map/CityMap";

export default function Dashboard() {

  return (
    <div className="dashboard">

      <CityMap />

      <div className="rightPanel">

        <WeatherPanel />

        <PollutionPanel />

        <SimulationControls />

      </div>

    </div>
  );
}