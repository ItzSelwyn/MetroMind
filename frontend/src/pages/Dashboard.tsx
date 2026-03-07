import CityMap from "../components/Map/CityMap";
import Sidebar from "../components/UI/Sidebar";

function Dashboard() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1 }}>
        <CityMap />
      </div>
    </div>
  );
}

export default Dashboard;