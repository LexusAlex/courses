import { learningUi } from '../data/learning-ui.mjs';

/** @param {number | null | undefined} minutes @param {'ru' | 'en'} locale */
export function formatDuration(minutes, locale) {
  const labels = learningUi[locale];
  if (minutes == null) return labels.unknownDuration;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours ? `${hours} ${labels.hour}` : '', remainder ? `${remainder} ${labels.minute}` : ''].filter(Boolean).join(' ');
}

/** @param {string} text */
const normalize = (text) => text.normalize('NFKC').toLowerCase().replaceAll('ё', 'е').trim();

/** @param {{ search: string, categories: string[], difficulty?: string, durationMinutes?: number | null }} course
 * @param {{ query?: string, category?: string, difficulty?: string, duration?: string }} filters
 */
export function matchesCourse(course, filters) {
  const words = normalize(filters.query ?? '').split(/\s+/).filter(Boolean);
  const text = normalize(course.search);
  if (!words.every((word) => text.includes(word))) return false;
  if (filters.category && !course.categories.includes(filters.category)) return false;
  if (filters.difficulty && (course.difficulty ?? 'unspecified') !== filters.difficulty) return false;
  const minutes = course.durationMinutes;
  switch (filters.duration) {
    case 'short': return minutes != null && minutes <= 120;
    case 'medium': return minutes != null && minutes > 120 && minutes <= 480;
    case 'long': return minutes != null && minutes > 480;
    case 'unknown': return minutes == null;
    default: return true;
  }
}
