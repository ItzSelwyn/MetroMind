import { startSimulation } from "../../api/metromindApi";

export default function SimulationControls() {

  const start = async () => {

    await startSimulation(2, 3);

    alert("Simulation started");

  };

  return (
    <div>

      <button onClick={start}>
        Start Traffic Simulation
      </button>

    </div>
  );
}