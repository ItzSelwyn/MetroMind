import { useEffect, useState } from "react";
import { getWeather } from "../../api/metromindApi";

export default function WeatherPanel() {

  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    getWeather().then(setWeather);
  }, []);

  if (!weather) return <div>Loading weather...</div>;

  return (
    <div className="panel">

      <h3>Weather</h3>

      <p>Temperature: {weather.weather.temperature}°C</p>
      <p>Humidity: {weather.weather.humidity}%</p>
      <p>Condition: {weather.weather.condition}</p>

      <h4>Wind</h4>

      <p>Speed: {weather.wind.speed} m/s</p>
      <p>Direction: {weather.wind.direction}°</p>

    </div>
  );
}