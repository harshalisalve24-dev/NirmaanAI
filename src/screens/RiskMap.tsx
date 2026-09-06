import { useState, useEffect, useMemo } from "react";
import type { Screen } from "../App";
import type { Project } from "../types/project";
import { getProjectsCached } from "../services/projectService";
import { predictProjectsRiskBatch, type RiskPredictionResult } from "../services/apiService";

// MapMarker: a Project subset with SVG pixel coordinates for the India outline map.
// x and y positions are hardcoded per-marker (not stored in Firestore).
// All IDs match actual Project Codes in Firestore (String(csvProjectCode)).
type MapMarker = Pick<Project, "id" | "name" | "sector" | "agency"> & {
  risk: NonNullable<Project["risk"]>;
  physicalProgress: Project["physicalProgress"];
  progressGap: Project["progressGap"];
  riskScore?: number;
  predictedDelayMonths?: number;
  x: number;
  y: number;
};

// 14 curated projects from NirmaanAI_Feature_Engineered.csv (182 total).
// IDs = String(Project Code) — navigate("project-overview", id) fetches from Firestore.
const markers: MapMarker[] = [
  // Coal — Vidarbha / Central India
  { id: "400353", name: "DHUPTALA OC [SASTI UG TO OC ]", sector: "Coal", agency: "WCL - CIL", risk: "Critical", physicalProgress: 19, progressGap: 5.57, x: 295, y: 245 },
  // Railways — Nagpur Itarsi
  { id: "705507", name: "ITARSI-NAGPUR 3RD LINE", sector: "Railways", agency: "Central Railway", risk: "High", physicalProgress: 86, progressGap: -3.5, x: 265, y: 248 },
  // Urban Transport — Mumbai Metro
  { id: "702637", name: "Mumbai Metro Line 3", sector: "Urban Public Transport", agency: "Mumbai Metro Rail Corporation Limited [MMRC]", risk: "Critical", physicalProgress: 99, progressGap: -1, x: 182, y: 308 },
  // Railways — Western DFC
  { id: "705237", name: "WESTERN DFC - REWARI TO VADODARA", sector: "Railways", agency: "DFCCIL", risk: "High", physicalProgress: 92, progressGap: -2, x: 170, y: 200 },
  // Roads — NH66 Panvel Indapur
  { id: "619095", name: "NH 66 Panvel to Indapur", sector: "Roads & Highways", agency: "NHAI", risk: "Critical", physicalProgress: 12, progressGap: -50, x: 178, y: 315 },
  // Oil & Gas — PDHPP Raigad
  { id: "400168", name: "PDHPP, USAR, RAIGAD", sector: "Oil & Gas", agency: "GAIL (India) Limited", risk: "High", physicalProgress: 74, progressGap: -14, x: 188, y: 312 },
  // Healthcare — Butibori
  { id: "612213", name: "ESIC HOSPITAL BUTIBORI NAGPUR", sector: "Healthcare", agency: "ESIC", risk: "Medium", physicalProgress: 34, progressGap: -25, x: 288, y: 250 },
  // Telecom — BharatNet
  { id: "706775", name: "BharatNet", sector: "Telecommunication", agency: "Department of Telecommunications [DoT]", risk: "Low", physicalProgress: 100, progressGap: -20, x: 255, y: 195 },
  // Power — Inter-Regional Strengthening
  { id: "617808", name: "Inter-Regional Strengthening SR-WR Grid", sector: "Transmission & Distribution", agency: "Power Grid Corporation of India Limited [POWERGRID]", risk: "Medium", physicalProgress: 3, progressGap: -41, x: 218, y: 378 },
  // Urban — Kalyan Station
  { id: "701991", name: "Kalyan Station Precinct Improvement Project", sector: "Urban Public Transport", agency: "ministry of housing and urban affairs", risk: "Critical", physicalProgress: 85, progressGap: -15, x: 192, y: 305 },
  // Water — Gosikhurd
  { id: "701386", name: "Gosikhurd Project", sector: "Water Resources", agency: "Department of water resources-MH - II", risk: "Critical", physicalProgress: 73, progressGap: -27, x: 305, y: 252 },
  // Roads — Gharapuri
  { id: "618628", name: "Strengthening NH 965 Pandharpur", sector: "Roads & Highways", agency: "NHAI", risk: "High", physicalProgress: 69, progressGap: -31, x: 215, y: 330 },
  // Telecom — LWE Phase 1
  { id: "617413", name: "Mobile connectivity in LWE areas Phase 1", sector: "Telecommunication", agency: "Department of Telecommunications [DoT]", risk: "High", physicalProgress: 99, progressGap: -1, x: 315, y: 285 },
  // Roads — Vadodara Mumbai Expressway
  { id: "618512", name: "Khambataki Ghat Tunnel", sector: "Roads & Highways", agency: "NHAI", risk: "Critical", physicalProgress: 89, progressGap: -11, x: 170, y: 298 },
];

const riskColors: Record<string, string> = {
  Critical: "#dc2626",
  High: "#ea580c",
  Medium: "#d97706",
  Low: "#16a34a",
};

const riskOrder = ["Critical", "High", "Medium", "Low"];


export default function RiskMap({ navigate }: { navigate: (s: Screen, project?: string) => void }) {
  const [predictions, setPredictions] = useState<Map<string, RiskPredictionResult>>(new Map());
  const [selected, setSelected] = useState<MapMarker | null>(null);
  const [filter, setFilter] = useState("All");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    getProjectsCached()
      .then(async (all) => {
        const markerProjects = all.filter((p) => markers.some((m) => m.id === p.id));
        try {
          const predMap = await predictProjectsRiskBatch(markerProjects);
          setPredictions(predMap);
        } catch (err) {
          console.warn("[RiskMap] batch prediction error:", err);
        }
      })
      .catch((err) => console.error("[RiskMap] load projects failed:", err));
  }, []);

  const dynamicMarkers = useMemo(() => {
    return markers.map((m) => {
      const pred = predictions.get(m.id);
      if (!pred) return m;
      return {
        ...m,
        risk: (pred.risk_level as MapMarker["risk"]) || m.risk,
        riskScore: pred.risk_score,
        predictedDelayMonths: pred.predicted_delay_months,
      };
    });
  }, [predictions]);

  const visibleMarkers = filter === "All" ? dynamicMarkers : dynamicMarkers.filter((m) => m.risk === filter);

  const counts = {
    Critical: dynamicMarkers.filter((m) => m.risk === "Critical").length,
    High: dynamicMarkers.filter((m) => m.risk === "High").length,
    Medium: dynamicMarkers.filter((m) => m.risk === "Medium").length,
    Low: dynamicMarkers.filter((m) => m.risk === "Low").length,
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 fade-in" style={{ minHeight: "100vh" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.08)" }}>
        <div>
          <h1 className="font-display font-bold text-white text-lg">Infrastructure Risk Map</h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.7)" }}>
            {visibleMarkers.length} project{visibleMarkers.length !== 1 ? "s" : ""} displayed · Click a marker for details
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["All", ...riskOrder].map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: filter === r
                  ? r === "All" ? "#2563eb" : riskColors[r]
                  : "rgba(255,255,255,0.07)",
                color: filter === r ? "white" : "rgba(148,163,184,0.8)",
              }}
            >
              {r}
              {r !== "All" && (
                <span className="ml-1.5 opacity-75">
                  ({counts[r as keyof typeof counts]})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 relative overflow-hidden">
        {/* Map area */}
        <div className="flex-1 relative">
          <svg
            viewBox="0 0 560 560"
            className="w-full h-full"
            style={{ background: "#0f172a" }}
            onClick={() => setSelected(null)}
          >
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(37,99,235,0.06)" strokeWidth="0.5"/>
              </pattern>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <rect width="560" height="560" fill="url(#grid)"/>

            {/* India outline — simplified path */}
            <path
              d="M 185 75
                 L 220 65 L 260 60 L 295 65 L 325 72 L 355 80
                 L 375 90 L 390 105 L 400 120 L 405 140
                 L 415 155 L 430 165 L 445 175 L 455 190
                 L 460 205 L 450 220 L 440 235 L 430 250
                 L 420 270 L 410 285 L 400 300 L 390 315
                 L 375 330 L 360 345 L 340 360 L 315 375
                 L 295 390 L 275 410 L 260 430 L 250 450
                 L 245 465 L 248 480 L 255 490
                 L 245 492 L 235 488 L 228 478 L 222 465
                 L 215 448 L 210 430 L 200 415 L 188 400
                 L 175 385 L 162 370 L 150 355 L 142 340
                 L 138 325 L 135 310 L 130 295 L 128 278
                 L 130 262 L 128 245 L 125 230 L 122 215
                 L 118 200 L 115 185 L 115 170 L 118 155
                 L 122 140 L 128 125 L 138 110 L 150 98
                 L 163 88 L 175 80 Z"
              fill="rgba(30,58,138,0.25)"
              stroke="rgba(59,130,246,0.4)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* Kashmir outline */}
            <path
              d="M 185 75 L 175 68 L 168 60 L 172 48 L 183 42
                 L 200 45 L 210 52 L 215 62 L 220 65"
              fill="rgba(30,58,138,0.2)"
              stroke="rgba(59,130,246,0.3)"
              strokeWidth="1.2"
            />

            {/* Northeast */}
            <path
              d="M 405 140 L 415 135 L 430 130 L 450 132
                 L 465 140 L 470 155 L 465 168 L 455 175
                 L 445 175"
              fill="rgba(30,58,138,0.2)"
              stroke="rgba(59,130,246,0.3)"
              strokeWidth="1.2"
            />

            {/* Sri Lanka */}
            <path
              d="M 260 500 L 265 496 L 272 500 L 270 510 L 263 512 Z"
              fill="rgba(30,58,138,0.15)"
              stroke="rgba(59,130,246,0.25)"
              strokeWidth="1"
            />

            {/* State boundaries (simplified) */}
            <g stroke="rgba(59,130,246,0.12)" strokeWidth="0.8" fill="none">
              <line x1="185" y1="175" x2="290" y2="175"/>
              <line x1="290" y1="175" x2="395" y2="175"/>
              <line x1="185" y1="265" x2="305" y2="265"/>
              <line x1="305" y1="265" x2="390" y2="250"/>
              <line x1="185" y1="330" x2="290" y2="330"/>
              <line x1="290" y1="265" x2="290" y2="175"/>
              <line x1="215" y1="265" x2="215" y2="175"/>
              <line x1="340" y1="265" x2="340" y2="175"/>
              <line x1="215" y1="330" x2="215" y2="265"/>
              <line x1="265" y1="395" x2="265" y2="330"/>
              <line x1="185" y1="400" x2="290" y2="395"/>
            </g>

            {/* Markers */}
            {visibleMarkers.map((m) => {
              const color = riskColors[m.risk];
              const isSelected = selected?.id === m.id;
              const isHovered = hoveredId === m.id;
              const radius = isSelected ? 10 : isHovered ? 9 : 7;
              return (
                <g
                  key={m.id}
                  className="map-marker"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(m);
                  }}
                  onMouseEnter={() => setHoveredId(m.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Pulse ring for critical */}
                  {m.risk === "Critical" && (
                    <circle
                      cx={m.x}
                      cy={m.y}
                      r={radius + 4}
                      fill="none"
                      stroke={color}
                      strokeWidth="1.5"
                      opacity="0.3"
                      className="pulse-ring"
                    />
                  )}
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r={radius + 2}
                    fill={color}
                    opacity="0.2"
                  />
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r={radius}
                    fill={color}
                    filter="url(#glow)"
                    stroke="white"
                    strokeWidth={isSelected ? 2 : 1}
                    opacity={isSelected || isHovered ? 1 : 0.9}
                  />
                  {/* Sector icon inside marker */}
                  <text x={m.x} y={m.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="white" fontWeight="bold">
                    {m.sector === "Roads & Highways" ? "R" : m.sector === "Railways" ? "T" : m.sector === "Urban Public Transport" ? "M" : m.sector === "Transmission & Distribution" ? "P" : m.sector === "Coal" ? "C" : m.sector === "Oil & Gas" ? "O" : m.sector === "Healthcare" ? "H" : m.sector === "Telecommunication" ? "L" : m.sector === "Water Resources" ? "W" : m.sector[0]}
                  </text>
                  {/* Label on hover */}
                  {(isHovered || isSelected) && (
                    <foreignObject x={m.x + 12} y={m.y - 16} width="140" height="40">
                      <div
                        style={{
                          background: "rgba(15,23,42,0.95)",
                          border: `1px solid ${color}60`,
                          borderRadius: 6,
                          padding: "3px 7px",
                          fontSize: 10,
                          color: "white",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 138,
                        }}
                      >
                        {m.name.length > 28 ? m.name.slice(0, 28) + "…" : m.name}
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}

            {/* Legend */}
            <g>
              <rect x="15" y="15" width="130" height="96" rx="6" fill="rgba(15,23,42,0.9)" stroke="rgba(59,130,246,0.2)" strokeWidth="1"/>
              <text x="25" y="32" fill="rgba(148,163,184,0.8)" fontSize="9" fontWeight="600" fontFamily="Inter, sans-serif" letterSpacing="1">RISK LEVEL</text>
              {riskOrder.map((r, i) => (
                <g key={r}>
                  <circle cx="27" cy={47 + i * 16} r="5" fill={riskColors[r]}/>
                  <text x="38" y={47 + i * 16 + 1} fill="rgba(203,213,225,0.9)" fontSize="10" dominantBaseline="middle" fontFamily="Inter, sans-serif">{r}</text>
                  <text x="130" y={47 + i * 16 + 1} fill="rgba(203,213,225,0.6)" fontSize="9" dominantBaseline="middle" textAnchor="end" fontFamily="Inter, sans-serif">
                    {counts[r as keyof typeof counts]}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Right panel */}
        {selected ? (
          <div
            className="w-80 border-l flex flex-col fade-in"
            style={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: riskColors[selected.risk] + "25",
                    color: riskColors[selected.risk],
                    border: `1px solid ${riskColors[selected.risk]}40`,
                  }}
                >
                  {selected.risk} Risk
                </span>
                <button
                  onClick={() => setSelected(null)}
                  className="text-slate-500 hover:text-slate-300 text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <h2 className="font-display font-bold text-white text-sm leading-snug">{selected.name}</h2>
              <p className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.6)" }}>{selected.sector} · {selected.agency}</p>
            </div>

            <div className="px-5 py-4 flex-1">
              <div className="space-y-4">
                <div className="rounded-xl p-4" style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)" }}>
                  <div className="text-xs text-red-300 mb-1">Progress Gap</div>
                  <div className="font-display font-bold text-red-400 text-2xl">
                    {Math.abs(selected.progressGap).toFixed(1)}% behind target
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Physical Progress</span>
                    <span className="text-xs font-semibold text-white">{selected.physicalProgress}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${selected.physicalProgress}%`,
                        background: selected.physicalProgress < 40 ? "#dc2626" : selected.physicalProgress < 65 ? "#d97706" : "#16a34a",
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Sector", value: selected.sector },
                    { label: "Agency", value: selected.agency },
                    { label: "Risk Level", value: selected.risk },
                    { label: "Progress Gap", value: `${Math.abs(selected.progressGap).toFixed(1)}%` },
                  ].map((f) => (
                    <div key={f.label} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="text-xs mb-1" style={{ color: "rgba(148,163,184,0.5)" }}>{f.label}</div>
                      <div className="text-sm font-semibold text-white">{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t space-y-2" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <button
                onClick={() => navigate("project-overview", selected.id)}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: "#2563eb" }}
              >
                View Project Overview →
              </button>
              <button
                onClick={() => navigate("ai-risk-analysis", selected.id)}
                className="w-full py-2.5 rounded-lg text-sm font-medium"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(148,163,184,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Run Risk Analysis
              </button>
            </div>
          </div>
        ) : (
          <div
            className="w-72 border-l flex items-center justify-center"
            style={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="text-center px-6">
              <div className="text-3xl mb-3">📍</div>
              <div className="text-sm font-medium text-slate-400">Click a marker on the map to view project details</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
