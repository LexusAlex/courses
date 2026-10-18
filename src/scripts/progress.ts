import { learningUi } from '../data/learning-ui.mjs';
import { courseProgress, emptyProgress, progressStorageKey, readProgress, saveProgress, setCompleted, visitLesson, exportProgress, importProgress, mergeProgress, MAX_BACKUP_BYTES, type ProgressState } from '../lib/progress.mjs';

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
  const saved = saveProgress(storage, key, state);
  if (saved) errors.delete(key);
  else errors.add(key);
  return saved;
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
    const completeAndGo = root.querySelector<HTMLAnchorElement>('[data-complete-and-go]');
    if (completeAndGo) {
      completeAndGo.hidden = false;
      const done = state.completed.includes(root.dataset.currentLesson ?? '');
      completeAndGo.textContent = root.dataset.hasNext === 'true' ? (done ? labels.goNext : labels.completeNext) : (done ? labels.back : labels.completeFinish);
    }
  });
  document.querySelectorAll<HTMLElement>('[data-course-outline]').forEach((root) => {
    const state = read(progressStorageKey(root.dataset.base ?? ''));
    const labels = learningUi[root.dataset.locale === 'en' ? 'en' : 'ru'];
    root.querySelectorAll<HTMLElement>('[data-lesson-row]').forEach((row) => {
      const id = row.dataset.lessonId ?? '';
      const status = state.completed.includes(id) ? 'completed' : state.lastVisited.includes(id) ? 'current' : 'notStarted';
      row.dataset.state = status;
      const badge = row.querySelector<HTMLElement>('[data-lesson-status]');
      if (badge) badge.textContent = labels[status];
    });
    root.querySelectorAll<HTMLElement>('[data-module-lessons]').forEach((badge) => {
      const ids: string[] = JSON.parse(badge.dataset.moduleLessons ?? '[]');
      const done = ids.filter((id) => state.completed.includes(id)).length;
      badge.textContent = labels.moduleProgress.replace('{done}', String(done)).replace('{total}', String(ids.length));
    });
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
      root.querySelector<HTMLAnchorElement>('[data-complete-and-go]')?.addEventListener('click', (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
        if (!write(key, setCompleted(visitLesson(read(key), current), current, true))) event.preventDefault();
        render();
      });
    }
  });
  document.querySelectorAll<HTMLElement>('[data-progress-transfer]').forEach((root) => {
    if (root.dataset.transferBound) return;
    root.dataset.transferBound = 'true';
    root.hidden = false;
    const key = progressStorageKey(root.dataset.base ?? '');
    const labels = learningUi[root.dataset.locale === 'en' ? 'en' : 'ru'];
    const status = root.querySelector<HTMLElement>('[data-transfer-status]')!;
    const input = root.querySelector<HTMLInputElement>('[data-progress-import]')!;
    root.querySelector('[data-progress-import-button]')!.addEventListener('click', () => input.click());
    root.querySelector('[data-progress-export]')!.addEventListener('click', () => {
      try {
        const blob = new Blob([exportProgress(read(key))], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'courses-progress.json';
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        status.textContent = labels.exportDone;
      } catch { status.textContent = labels.exportError; }
    });
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        if (file.size > MAX_BACKUP_BYTES) throw new Error('Backup size limit');
        const incoming = importProgress(await file.text());
        const saved = write(key, mergeProgress(read(key), incoming));
        status.textContent = saved ? labels.importDone : labels.storageError;
        render();
      } catch { status.textContent = labels.importError; }
      finally { input.value = ''; }
    });
  });
  render();
}
init();
document.addEventListener('astro:page-load', init);
window.addEventListener('pageshow', render);
window.addEventListener('storage', (event) => { if (event.key?.startsWith('courses:progress:v1:') || event.key === null) render(); });
