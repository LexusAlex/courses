import { learningUi } from '../data/learning-ui.mjs';
import { courseProgress, emptyProgress, progressStorageKey, readProgress, saveProgress, setCompleted, visitLesson, type ProgressState } from '../lib/progress.mjs';

type ManifestLesson = { id: string; path: string };
const memory = new Map<string, ProgressState>();
const storage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
};
const errors = new Set<string>();

function read(key: string) {
  const result = readProgress(storage, key);
  if (result.error) { errors.add(key); return memory.get(key) ?? emptyProgress(); }
  // Retain in-memory changes if writing was blocked.
  if (errors.has(key) && memory.has(key)) return memory.get(key)!;
  memory.set(key, result.state);
  return result.state;
}

function write(key: string, state: ProgressState) {
  memory.set(key, state);
  if (saveProgress(storage, key, state)) errors.delete(key);
  else errors.add(key);
}

function render() {
  document.querySelectorAll<HTMLElement>('[data-course-progress]').forEach((root) => {
    const key = progressStorageKey(root.dataset.base ?? '');
    const state = read(key);
    const lessons: ManifestLesson[] = JSON.parse(root.dataset.lessons ?? '[]');
    const result = courseProgress(state, lessons.map((lesson) => lesson.id));
    const labels = learningUi[root.dataset.locale === 'en' ? 'en' : 'ru'];
    const count = root.querySelector<HTMLElement>('[data-progress-count]');
    if (count) count.textContent = labels.progressText.replace('{done}', String(result.done)).replace('{total}', String(result.total)).replace('{percent}', String(result.percent));
    const bar = root.querySelector('progress');
    if (bar) bar.value = result.done;
    const toggle = root.querySelector<HTMLInputElement>('[data-lesson-toggle]');
    if (toggle) { toggle.checked = state.completed.includes(root.dataset.currentLesson ?? ''); toggle.disabled = false; }
    const control = root.querySelector<HTMLElement>('[data-lesson-control]');
    if (control) control.hidden = false;
    const resume = root.querySelector<HTMLAnchorElement>('[data-progress-resume]');
    const target = lessons.find((lesson) => lesson.id === result.resumeId);
    if (resume && target) {
      resume.href = `${root.dataset.base ?? ''}/${target.path}/`;
      resume.textContent = result.finished ? labels.review : result.started ? labels.resume : labels.start;
    }
    const error = root.querySelector<HTMLElement>('[data-storage-error]');
    if (error) error.hidden = !errors.has(key);
  });
}

function init() {
  document.querySelectorAll<HTMLElement>('[data-course-progress]').forEach((root) => {
    if (root.dataset.progressBound) return;
    root.dataset.progressBound = 'true';
    const key = progressStorageKey(root.dataset.base ?? '');
    const current = root.dataset.currentLesson;
    const lessons: ManifestLesson[] = JSON.parse(root.dataset.lessons ?? '[]');
    if (current && lessons.some((lesson) => lesson.id === current)) {
      write(key, visitLesson(read(key), current));
      root.querySelector<HTMLInputElement>('[data-lesson-toggle]')?.addEventListener('change', (event) => {
        // Read the latest value immediately before writing, including changes from another tab.
        write(key, setCompleted(visitLesson(read(key), current), current, (event.currentTarget as HTMLInputElement).checked));
        render();
      });
    }
  });
  render();
}
init();
document.addEventListener('astro:page-load', init);
window.addEventListener('pageshow', render);
window.addEventListener('storage', (event) => { if (event.key?.startsWith('courses:progress:v1:') || event.key === null) render(); });
