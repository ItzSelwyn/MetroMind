function Sidebar() {
  return (
    <div style={{ padding: "20px" }}>
      <h2>MetroMind</h2>
      <p>Layers</p>

      <div>
        <label>
          <input type="checkbox" defaultChecked /> traffic
        </label>
      </div>

      <div>
        <label>
          <input type="checkbox" defaultChecked /> wind
        </label>
      </div>

      <div>
        <label>
          <input type="checkbox" /> pollution
        </label>
      </div>

      <div>
        <label>
          <input type="checkbox" /> energy
        </label>
      </div>
    </div>
  );
}

export default Sidebar;