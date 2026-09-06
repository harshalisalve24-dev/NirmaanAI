import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Project } from "../types/project";

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

/** Fetch all projects once per session; return cached result on subsequent calls. */
export async function getProjectsCached(): Promise<Project[]> {
  if (_cache) return _cache;
  if (!_fetchPromise) {
    _fetchPromise = getAllProjects().then((ps) => {
      _cache = ps;
      _fetchPromise = null;
      return ps;
    });
  }
  return _fetchPromise;
}

/** Invalidate the in-memory cache (call after a fresh import). */
export function invalidateProjectCache(): void {
  _cache = null;
  _fetchPromise = null;
}
