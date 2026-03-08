import type { BlockImpactAnalysis } from "../../api/metromindApi";

interface ImpactAnalysisPanelProps {
  analysis: BlockImpactAnalysis | null;
  selectedTitle: string | null;
  onClose: () => void;
  onSelectFeature: (selection: {
    title: string;
    feature: NonNullable<BlockImpactAnalysis["primary_reroute"]>["reroute_path"];
  } | null) => void;
}

function formatRoadLabels(labels: string[]) {
  return labels.length > 0 ? labels.join(" -> ") : "No clear reroute corridor found";
}

export default function ImpactAnalysisPanel({
  analysis,
  selectedTitle,
  onClose,
  onSelectFeature,
}: ImpactAnalysisPanelProps) {
  if (!analysis) {
    return null;
  }

  const primaryReroute = analysis.primary_reroute;

  return (
    <div className="analysisOverlay">
      <div className="analysisOverlay__backdrop" onClick={onClose} />

      <div className="analysisPanel analysisPanel--fullscreen">
        <div className="analysisPanel__header">
          <div>
            <h3>Closure Analysis</h3>
            <p className="analysisPanel__intro">
              Blocking <strong>{analysis.blocked_road.road}</strong> likely affects {analysis.affected_trip_count} sampled trips.
              Click a reroute or road below to highlight it on the map.
            </p>
          </div>
          <div className="analysisPanel__headerActions">
            <span className="analysisPanel__badge">Live estimate</span>
            <button
              type="button"
              className="analysisPanel__close"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div className="analysisPanel__grid">
          <div className="analysisPanel__section">
            <h4>Blocked Segment</h4>
            <p>{analysis.blocked_road.road_type} road</p>
            <p>{analysis.blocked_road.length_km} km length</p>
            <p>Estimated capacity {analysis.blocked_road.capacity}</p>
          </div>

          {primaryReroute ? (
            <button
              type="button"
              className={`analysisPanel__section analysisPanel__sectionButton${selectedTitle === "Primary reroute" ? " analysisPanel__sectionButton--active" : ""}`}
              onClick={() => onSelectFeature({
                title: "Primary reroute",
                feature: primaryReroute.reroute_path
              })}
            >
              <h4>Primary Reroute</h4>
              <p>{formatRoadLabels(primaryReroute.after.road_labels)}</p>
              <p>
                Extra distance {primaryReroute.extra_distance_km} km
                {" "}
                and extra time {primaryReroute.extra_travel_minutes} min
              </p>
              <p>
                Before: {primaryReroute.before.distance_km} km in {primaryReroute.before.travel_minutes} min
              </p>
              <p>
                After: {primaryReroute.after.distance_km} km in {primaryReroute.after.travel_minutes} min
              </p>
            </button>
          ) : (
            <div className="analysisPanel__section">
              <h4>Primary Reroute</h4>
              <p>No strong diversion corridor was found in the sampled trips.</p>
            </div>
          )}
        </div>

        <div className="analysisPanel__grid">
          <div className="analysisPanel__section">
            <h4>Most Reused Roads</h4>
            {analysis.top_reused_roads.length > 0 ? (
              <ul className="analysisPanel__list">
                {analysis.top_reused_roads.map((road) => (
                  <li key={`${road.road}-${road.road_type}`}>
                    <button
                      type="button"
                      className={`analysisPanel__itemButton${selectedTitle === road.road ? " analysisPanel__itemButton--active" : ""}`}
                      onClick={() => road.map_feature ? onSelectFeature({ title: road.road, feature: road.map_feature }) : onSelectFeature(null)}
                    >
                      <span>{road.road}</span>
                      <span>{road.reuse_count} reroutes</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No repeated reroute roads were identified.</p>
            )}
          </div>

          <div className="analysisPanel__section">
            <h4>Pressure Hotspots</h4>
            {analysis.traffic_hotspots.length > 0 ? (
              <ul className="analysisPanel__list">
                {analysis.traffic_hotspots.map((road) => (
                  <li key={`${road.road}-${road.estimated_pressure}`}>
                    <button
                      type="button"
                      className={`analysisPanel__itemButton${selectedTitle === `${road.road}-hotspot` ? " analysisPanel__itemButton--active" : ""}`}
                      onClick={() => road.map_feature ? onSelectFeature({ title: `${road.road}-hotspot`, feature: road.map_feature }) : onSelectFeature(null)}
                    >
                      <span>{road.road}</span>
                      <span>pressure {road.estimated_pressure}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No congestion hotspots were identified from the sampled reroutes.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}