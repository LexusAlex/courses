/** @typedef {{ version: 1, completed: string[], lastVisited: string[] }} ProgressState */

/** @returns {ProgressState} */
export const emptyProgress = () => ({ version: 1, completed: [], lastVisited: [] });

/** @param {string | null} raw @returns {ProgressState} */
export function parseProgress(raw) {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (value?.version !== 1 || !Array.isArray(value.completed) || !Array.isArray(value.lastVisited)) return emptyProgress();
    const validIds = (items) => [...new Set(items.filter((id) => typeof id === 'string' && id.includes('/') && id.length < 1024))];
    return { version: 1, completed: validIds(value.completed), lastVisited: validIds(value.lastVisited) };
  } catch { return emptyProgress(); }
}

/** @param {ProgressState} state @param {string} id @param {boolean} completed @returns {ProgressState} */
export function setCompleted(state, id, completed) {
  return { ...state, completed: completed ? [...new Set([...state.completed, id])] : state.completed.filter((item) => item !== id) };
}

/** @param {ProgressState} state @param {string} id @returns {ProgressState} */
export function visitLesson(state, id) {
  const course = id.split('/')[0];
  return { ...state, lastVisited: [id, ...state.lastVisited.filter((item) => item.split('/')[0] !== course)] };
}

/** @param {ProgressState} state @param {string[]} ids */
export function courseProgress(state, ids) {
  const uniqueIds = [...new Set(ids)];
  const done = uniqueIds.filter((id) => state.completed.includes(id)).length;
  const total = uniqueIds.length;
  const last = state.lastVisited.find((id) => uniqueIds.includes(id));
  const next = last && !state.completed.includes(last) ? last : uniqueIds.find((id) => !state.completed.includes(id));
  return { done, total, percent: total ? Math.round(done / total * 100) : 0, resumeId: next ?? uniqueIds[0], started: Boolean(last || done), finished: total > 0 && done === total };
}

/** @param {string} base */
export const progressStorageKey = (base) => `courses:progress:v1:${base.replace(/\/+$/, '') || '/'}`;

/** @param {{ getItem: (key: string) => string | null }} storage @param {string} key */
export function readProgress(storage, key) {
  try { return { state: parseProgress(storage.getItem(key)), error: false }; }
  catch { return { state: emptyProgress(), error: true }; }
}

/** @param {{ setItem: (key: string, value: string) => void }} storage @param {string} key @param {ProgressState} state */
export function saveProgress(storage, key, state) {
  try { storage.setItem(key, JSON.stringify(state)); return true; }
  catch { return false; }
}

export const MAX_BACKUP_BYTES = 1024 * 1024;

/** A portable backup contains no locale, domain or deployment path.
 * @param {ProgressState} state
 */
export function exportProgress(state) {
  const raw = JSON.stringify({ format: 'courses-progress', version: 1, exportedAt: new Date().toISOString(), state }, null, 2);
  importProgress(raw);
  return raw;
}

/** Strict parsing is separate from the forgiving browser-cache reader.
 * @param {string} raw @returns {ProgressState}
 */
export function importProgress(raw) {
  if (new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES) throw new Error('Backup exceeds the size limit.');
  let value;
  try { value = JSON.parse(raw.replace(/^\uFEFF/, '')); } catch { throw new Error('Invalid progress backup.'); }
  const state = value?.state;
  const valid = (items) => Array.isArray(items) && items.length <= 10000 && items.every((id) => typeof id === 'string' && id.length < 1024 && id.includes('/') && !/[\u0000-\u001f]/.test(id));
  if (value?.format !== 'courses-progress' || value.version !== 1 || state?.version !== 1 || !valid(state.completed) || !valid(state.lastVisited)) {
    throw new Error('Unsupported or invalid progress backup.');
  }
  return { version: 1, completed: [...new Set(state.completed)], lastVisited: [...new Set(state.lastVisited)] };
}

/** Imported completions are additive; recent visits from the backup take priority.
 * @param {ProgressState} current @param {ProgressState} incoming @returns {ProgressState}
 */
export function mergeProgress(current, incoming) {
  const courses = new Set();
  const lastVisited = [...incoming.lastVisited, ...current.lastVisited].filter((id) => {
    const course = id.split('/')[0];
    if (courses.has(course)) return false;
    courses.add(course);
    return true;
  });
  return { version: 1, completed: [...new Set([...current.completed, ...incoming.completed])], lastVisited };
}
