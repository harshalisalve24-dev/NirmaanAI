import { useState, useEffect } from "react";
import LoginScreen from "./screens/Login";
import CommandCenter from "./screens/CommandCenter";
import PriorityQueue from "./screens/PriorityQueue";
import RiskMap from "./screens/RiskMap";
import ProjectOverview from "./screens/ProjectOverview";
import AIRiskAnalysis from "./screens/AIRiskAnalysis";
import { importProjectsIfNeeded } from "./utils/importProjects";

export type Screen =
  | "login"
  | "command-center"
  | "priority-queue"
  | "risk-map"
  | "project-overview"
  | "ai-risk-analysis";

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Seed Firestore with all 182 CSV projects on first app load (after login).
  // Fires on mount. Idempotent — skips if 182 docs already exist in Firestore.
  // All progress is logged to the browser console under [NirmaanAI] prefix.
  useEffect(() => {
    importProjectsIfNeeded()
      .then(() => {
        // Success is logged inside importProjectsIfNeeded() itself
      })
      .catch((err: unknown) => {
        // Failure is also logged inside importProjectsIfNeeded() — this is an extra surface.
        const message =
          err instanceof Error ? err.message : String(err);
        console.error(
          "[NirmaanAI] Import error surfaced in App — check Firestore security rules.\n" +
          "Rules must allow read + write on /projects/{id} during development.\n" +
          "Error:", message
        );
      });
  }, [screen]); // re-run if user navigates (e.g. logs out and back in)

  const navigate = (s: Screen, project?: string) => {
    if (project) setSelectedProject(project);
    setScreen(s);
  };

  if (screen === "login") {
    return <LoginScreen onLogin={() => navigate("command-center")} />;
  }

  return (
    <div className="flex h-full bg-slate-50 font-sans">
      <Sidebar current={screen} navigate={navigate} />
      <main className="flex-1 overflow-auto">
        {screen === "command-center" && (
          <CommandCenter navigate={navigate} />
        )}
        {screen === "priority-queue" && (
          <PriorityQueue navigate={navigate} />
        )}
        {screen === "risk-map" && (
          <RiskMap navigate={navigate} />
        )}
        {screen === "project-overview" && (
          <ProjectOverview
            project={selectedProject}
            navigate={navigate}
          />
        )}
        {screen === "ai-risk-analysis" && (
          <AIRiskAnalysis project={selectedProject} navigate={navigate} />
        )}
      </main>
    </div>
  );
}

function Sidebar({
  current,
  navigate,
}: {
  current: Screen;
  navigate: (s: Screen) => void;
}) {
  const items = [
    { id: "command-center", label: "Command Center", icon: GridIcon },
    { id: "priority-queue", label: "Priority Queue", icon: ListIcon },
    { id: "risk-map", label: "Risk Map", icon: MapIcon },
  ] as const;

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col" style={{ background: "#0a1628" }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "#2563eb" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 14L7 9L10 12L14 6L17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="17" cy="5" r="2" fill="#60a5fa"/>
            </svg>
          </div>
          <div>
            <div className="font-display font-bold text-white text-base leading-tight">NirmaanAI</div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.8)" }}>Infrastructure Risk Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <div className="text-xs font-semibold uppercase tracking-widest mb-3 px-3" style={{ color: "rgba(148,163,184,0.5)" }}>
          Navigation
        </div>
        <div className="space-y-1">
          {items.map(({ id, label, icon: Icon }) => {
            const active = current === id;
            return (
              <button
                key={id}
                onClick={() => navigate(id as Screen)}
                className="sidebar-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left"
                style={{
                  background: active ? "rgba(37,99,235,0.2)" : "transparent",
                  color: active ? "#93c5fd" : "rgba(148,163,184,0.85)",
                  borderLeft: active ? "2px solid #2563eb" : "2px solid transparent",
                }}
              >
                <Icon size={16} active={active} />
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 text-xs font-semibold uppercase tracking-widest mb-3 px-3" style={{ color: "rgba(148,163,184,0.5)" }}>
          Analysis
        </div>
        <div className="space-y-1">
          {[
            { id: "project-overview", label: "Project Overview", icon: FolderIcon },
            { id: "ai-risk-analysis", label: "AI Risk Analysis", icon: BrainIcon },
          ].map(({ id, label, icon: Icon }) => {
            const active = current === id;
            return (
              <button
                key={id}
                onClick={() => navigate(id as Screen)}
                className="sidebar-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left"
                style={{
                  background: active ? "rgba(37,99,235,0.2)" : "transparent",
                  color: active ? "#93c5fd" : "rgba(148,163,184,0.85)",
                  borderLeft: active ? "2px solid #2563eb" : "2px solid transparent",
                }}
              >
                <Icon size={16} active={active} />
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#1e40af" }}>
            RK
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">Rajesh Kumar</div>
            <div className="text-xs truncate" style={{ color: "rgba(148,163,184,0.6)" }}>Senior Officer, MoRTH</div>
          </div>
        </div>
        <button
          onClick={() => navigate("login")}
          className="mt-3 w-full text-xs py-1.5 rounded text-center font-medium"
          style={{ color: "rgba(148,163,184,0.6)", background: "rgba(255,255,255,0.04)" }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function GridIcon({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1" fill={active ? "#60a5fa" : "currentColor"} fillOpacity={active ? 1 : 0.6}/>
      <rect x="9" y="1" width="6" height="6" rx="1" fill={active ? "#60a5fa" : "currentColor"} fillOpacity={active ? 1 : 0.6}/>
      <rect x="1" y="9" width="6" height="6" rx="1" fill={active ? "#60a5fa" : "currentColor"} fillOpacity={active ? 1 : 0.6}/>
      <rect x="9" y="9" width="6" height="6" rx="1" fill={active ? "#60a5fa" : "currentColor"} fillOpacity={active ? 1 : 0.6}/>
    </svg>
  );
}

function ListIcon({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="2" rx="1" fill={active ? "#60a5fa" : "currentColor"} fillOpacity={active ? 1 : 0.6}/>
      <rect x="1" y="7" width="14" height="2" rx="1" fill={active ? "#60a5fa" : "currentColor"} fillOpacity={active ? 1 : 0.6}/>
      <rect x="1" y="11" width="10" height="2" rx="1" fill={active ? "#60a5fa" : "currentColor"} fillOpacity={active ? 1 : 0.6}/>
    </svg>
  );
}

function MapIcon({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M1 3L5 1L10 3L15 1V13L10 15L5 13L1 15V3Z" stroke={active ? "#60a5fa" : "currentColor"} strokeWidth="1.5" strokeLinejoin="round" fill="none" opacity={active ? 1 : 0.6}/>
      <path d="M5 1V13M10 3V15" stroke={active ? "#60a5fa" : "currentColor"} strokeWidth="1.5" opacity={active ? 1 : 0.6}/>
    </svg>
  );
}

function FolderIcon({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M1 4C1 3.45 1.45 3 2 3H6L8 5H14C14.55 5 15 5.45 15 6V13C15 13.55 14.55 14 14 14H2C1.45 14 1 13.55 1 13V4Z" fill={active ? "#60a5fa" : "currentColor"} fillOpacity={active ? 0.3 : 0.2} stroke={active ? "#60a5fa" : "currentColor"} strokeWidth="1.2" opacity={active ? 1 : 0.6}/>
    </svg>
  );
}

function BrainIcon({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="5" cy="6" r="3" stroke={active ? "#60a5fa" : "currentColor"} strokeWidth="1.3" fill="none" opacity={active ? 1 : 0.6}/>
      <circle cx="11" cy="6" r="3" stroke={active ? "#60a5fa" : "currentColor"} strokeWidth="1.3" fill="none" opacity={active ? 1 : 0.6}/>
      <path d="M8 3V13M5 9C5 11 8 13 8 13C8 13 11 11 11 9" stroke={active ? "#60a5fa" : "currentColor"} strokeWidth="1.3" opacity={active ? 1 : 0.6}/>
    </svg>
  );
}
