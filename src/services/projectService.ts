import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Project, Intervention } from "../types/project";

const COL = "projects";

/** Fetch a single project by its string ID (= Project Code). Returns null if not found. */
export async function getProject(id: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? (snap.data() as Project) : null;
}

/** Fetch all projects. Client-side sort/filter after fetch (182 docs). */
export async function getAllProjects(): Promise<Project[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => d.data() as Project);
}

/**
 * Save or update a single project document in Firestore.
 * Automatically sanitizes undefined values and invalidates the session cache.
 */
export async function saveProject(project: Project): Promise<void> {
  const safe = stripUndefined(project as unknown as Record<string, unknown>);
  await setDoc(doc(db, COL, project.id), safe);
  invalidateProjectCache();
}

/**
 * Append a newly created intervention to a project's interventions array in Firestore.
 */
export async function addInterventionToProject(
  projectId: string,
  intervention: Intervention
): Promise<Project | null> {
  const p = await getProject(projectId);
  if (!p) return null;

  const existing = p.interventions ?? [];
  const updatedInterventions = [intervention, ...existing];
  const updatedProject: Project = {
    ...p,
    interventions: updatedInterventions,
  };

  await saveProject(updatedProject);
  return updatedProject;
}

/**
 * Count documents in the projects collection.
 * Returns 0 if the collection does not exist or is empty.
 */
export async function getProjectCount(): Promise<number> {
  const snap = await getDocs(collection(db, COL));
  return snap.size;
}

/**
 * Recursively strip every key whose value is `undefined` from a plain object.
 *
 * Firestore does NOT accept undefined values — they cause:
 *   "Function WriteBatch.set() called with invalid data. Unsupported field value: undefined"
 *
 * This sanitizer runs at the write boundary so:
 *  - The in-memory Project type can use optional fields (?: T)
 *  - The CSV parser can return undefined for missing values
 *  - Only the stored Firestore document is affected
 *
 * null values are preserved — they are valid Firestore field values.
 */
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue; // drop undefined — Firestore rejects it
    if (Array.isArray(val)) {
      // Sanitize each element of an array (e.g. riskFactors, milestones)
      out[key] = val.map((item) =>
        item !== null && typeof item === "object" && !Array.isArray(item)
          ? stripUndefined(item as Record<string, unknown>)
          : item
      );
    } else if (val !== null && typeof val === "object") {
      out[key] = stripUndefined(val as Record<string, unknown>);
    } else {
      out[key] = val;
    }
  }
  return out;
}

/**
 * Batch-write (overwrite) all projects to Firestore.
 * Applies stripUndefined() to every document before writing — Firestore
 * rejects `undefined` field values with a hard error.
 * Splits into chunks of 400 to stay under the 500-op Firestore batch limit.
 */
export async function batchUpsertProjects(projects: Project[]): Promise<void> {
  const BATCH_SIZE = 400;
  for (let i = 0; i < projects.length; i += BATCH_SIZE) {
    const chunk = projects.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const p of chunk) {
      const safe = stripUndefined(p as unknown as Record<string, unknown>);
      batch.set(doc(db, COL, p.id), safe);
    }
    await batch.commit();
    console.log(
      `[NirmaanAI] Batch committed: projects ${i + 1}–${Math.min(i + BATCH_SIZE, projects.length)} of ${projects.length}`
    );
  }
}

// ── Session-level cache ───────────────────────────────────────────────────────
// One getDocs per browser session; returns cached array on subsequent calls.

let _cache: Project[] | null = null;
let _fetchPromise: Promise<Project[]> | null = null;

import { loadProjectsFromCSV } from "../utils/importProjects";

/** Fetch all projects once per session; return cached result on subsequent calls. Fallbacks to CSV if Firestore is empty or fails. */
export async function getProjectsCached(): Promise<Project[]> {
  if (_cache && _cache.length > 0) return _cache;
  if (!_fetchPromise) {
    _fetchPromise = (async () => {
      try {
        const ps = await getAllProjects();
        if (ps && ps.length > 0) {
          _cache = ps;
          return ps;
        }
      } catch (err) {
        console.warn("[NirmaanAI] Firestore load failed, falling back to local bundled CSV:", err);
      }
      // Fallback to local CSV if Firestore is empty or errored out
      console.log("[NirmaanAI] Loading 182 projects from bundled CSV fallback...");
      const csvPs = loadProjectsFromCSV();
      if (csvPs.length > 0) {
        _cache = csvPs;
        return csvPs;
      }
      return [];
    })();
  }
  return _fetchPromise;
}

/** Invalidate the in-memory cache (call after a fresh import). */
export function invalidateProjectCache(): void {
  _cache = null;
  _fetchPromise = null;
}
