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
