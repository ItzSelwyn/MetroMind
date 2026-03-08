import { useEffect, useState } from "react";
import { getPollution } from "../../api/metromindApi";

export default function PollutionPanel() {

  const [pollution, setPollution] = useState<any>(null);

  useEffect(() => {
    getPollution().then(setPollution);
  }, []);

  if (!pollution) return <div className="panel panel--plain">Loading pollution...</div>;

  return (
    <div className="panel panel--plain">

      <h3>Pollution</h3>

      <p>AQI: {pollution.aqi}</p>
      <p>Status: {pollution.aqi_label}</p>

      <p>PM2.5: {pollution.components.pm2_5}</p>
      <p>PM10: {pollution.components.pm10}</p>

    </div>
  );
}