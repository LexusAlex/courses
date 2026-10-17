import assert from 'node:assert/strict';
import { test } from 'node:test';
import { indexCatalog } from '../src/data/catalog-tree.mjs';
import { formatDuration, matchesCourse } from '../src/lib/course-filters.mjs';
import { indexLessons, normalizeDocId } from '../src/lib/lessons.mjs';
import { courseProgress, emptyProgress, parseProgress, progressStorageKey, readProgress, saveProgress, setCompleted, visitLesson } from '../src/lib/progress.mjs';

const translation = { ru: 'Название', en: 'Title' };
const entry = (id, extra = {}) => ({ id, title: translation, description: translation, ...extra });
const roots = [entry('technology', { children: [entry('languages', { courses: [
  entry('php', { modules: [entry('basics'), entry('functions')] }), entry('git'),
] })] })];
const doc = (id, order, extra = {}) => ({ id, data: { title: `Title ${id}`, sidebar: { order }, ...extra } });
const searchable = { search: 'PHP с нуля Программирование', categories: ['technology', 'languages'], difficulty: 'beginner', durationMinutes: 240 };

test('valid difficulty and unknown/known durations are accepted', () => {
  const result = indexCatalog([entry('photo', { courses: [entry('camera', { difficulty: 'advanced', durationMinutes: 90 })] })]);
  assert.equal(result.courseById.get('camera').course.durationMinutes, 90);
  assert.equal(result.courseById.get('camera').course.difficulty, 'advanced');
  assert.equal(indexCatalog(roots).courseById.size, 2);
});
test('invalid difficulty and durations fail before building', () => {
  for (const metadata of [{ difficulty: 'easy' }, { durationMinutes: 0 }, { durationMinutes: -1 }, { durationMinutes: 1.5 }, { durationMinutes: '60' }, { durationMinutes: Infinity }]) {
    assert.throws(() => indexCatalog([entry('photo', { courses: [entry('camera', metadata)] })]), /difficulty|durationMinutes/);
  }
});
test('duration labels support both languages, hours and minutes', () => {
  assert.equal(formatDuration(90, 'ru'), '1 ч 30 мин');
  assert.equal(formatDuration(120, 'en'), '2 h');
  assert.equal(formatDuration(45, 'ru'), '45 мин');
  assert.equal(formatDuration(null, 'en'), 'Duration to be confirmed');
});
test('filters combine search words, ancestors, difficulty and duration', () => {
  assert.equal(matchesCourse(searchable, { query: 'PHP программ', category: 'technology', difficulty: 'beginner', duration: 'medium' }), true);
  for (const filters of [{ query: 'Python' }, { category: 'photography' }, { difficulty: 'advanced' }, { duration: 'short' }]) {
    assert.equal(matchesCourse(searchable, filters), false);
  }
});
test('search is case insensitive and matches е and ё', () => {
  assert.equal(matchesCourse({ ...searchable, search: 'СЪЁМКА фотографий' }, { query: 'съемка' }), true);
  assert.equal(matchesCourse(searchable, {}), true);
});
test('duration filter boundaries and unknown values are distinct', () => {
  assert.equal(matchesCourse({ ...searchable, durationMinutes: 120 }, { duration: 'short' }), true);
  assert.equal(matchesCourse({ ...searchable, durationMinutes: 120 }, { duration: 'medium' }), false);
  assert.equal(matchesCourse({ ...searchable, durationMinutes: 480 }, { duration: 'medium' }), true);
  assert.equal(matchesCourse({ ...searchable, durationMinutes: 481 }, { duration: 'long' }), true);
  assert.equal(matchesCourse({ ...searchable, durationMinutes: null }, { duration: 'short' }), false);
  assert.equal(matchesCourse({ ...searchable, durationMinutes: null }, { duration: 'unknown' }), true);
});
test('only published lessons enter course sequences', () => {
  const lessons = indexLessons([
    doc('ru/courses/php'), doc('ru/courses/php/basics/index'),
    doc('ru/courses/php/basics/variables', 1),
    doc('ru/courses/php/basics/draft', 2, { draft: true }),
    doc('ru/courses/php/basics/hidden', 3, { sidebar: { hidden: true } }),
    doc('ru/directions/technology'), doc('ru/reference/other'),
  ], roots);
  assert.deepEqual(lessons.map((lesson) => lesson.id), ['php/basics/variables']);
});
test('module order takes priority and lesson order breaks ties by stable path', () => {
  const lessons = indexLessons([
    doc('ru/courses/php/functions/return', -100),
    doc('ru/courses/php/basics/z-last'),
    doc('ru/courses/php/basics/b-second', 1),
    doc('ru/courses/php/basics/a-first', 1),
  ], roots);
  assert.deepEqual(lessons.map((lesson) => lesson.id), ['php/basics/a-first', 'php/basics/b-second', 'php/basics/z-last', 'php/functions/return']);
});
test('weighted nested lesson folders remain contiguous like the sidebar', () => {
  const lessons = indexLessons([
    doc('ru/courses/git/group/b', 20), doc('ru/courses/git/z', 2), doc('ru/courses/git/group/a', 1),
  ], roots);
  assert.deepEqual(lessons.map((lesson) => lesson.id), ['git/group/a', 'git/group/b', 'git/z']);
});
test('translations share stable progress IDs but have different URLs', () => {
  const lessons = indexLessons([doc('ru/courses/git/start', 1), doc('en/courses/git/start', 1)], roots);
  assert.equal(lessons[0].id, 'git/start');
  assert.equal(lessons[1].id, 'git/start');
  assert.deepEqual(lessons.map((lesson) => lesson.path).sort(), ['en/courses/git/start', 'ru/courses/git/start']);
});
test('sequences do not fabricate absent translations or cross course boundaries', () => {
  const lessons = indexLessons([doc('ru/courses/git/one', 1), doc('ru/courses/php/basics/one', 1)], roots);
  assert.deepEqual(lessons.filter((lesson) => lesson.courseId === 'git').map((lesson) => lesson.id), ['git/one']);
  assert.equal(lessons.filter((lesson) => lesson.locale === 'en').length, 0);
});
test('unknown courses, undeclared module paths and duplicate lesson routes fail clearly', () => {
  assert.throws(() => indexLessons([doc('ru/courses/unknown/one', 1)], roots), /unknown course/);
  assert.throws(() => indexLessons([doc('ru/courses/php/undeclared/one', 1)], roots), /declared course module/);
  assert.throws(() => indexLessons([doc('ru/courses/git/one', 1), doc('ru/courses/git/one', 2)], roots), /Duplicate lesson route/);
});
test('normalization removes only index files, not names ending with index', () => {
  assert.equal(normalizeDocId('ru/courses/git/index.mdx'), 'ru/courses/git');
  assert.equal(normalizeDocId('ru/courses/git/search-index'), 'ru/courses/git/search-index');
});
test('corrupt, unsupported and wrong-shaped stored data falls back to empty progress', () => {
  for (const raw of [null, '{', 'null', '{"version":2,"completed":[],"lastVisited":[]}', '{"version":1,"completed":{},"lastVisited":[]}']) {
    assert.deepEqual(parseProgress(raw), { version: 1, completed: [], lastVisited: [] });
  }
  assert.deepEqual(parseProgress('{"version":1,"completed":["git/one","git/one",42],"lastVisited":[]}').completed, ['git/one']);
});
test('marking and unmarking lessons persists through serialized state', () => {
  const marked = setCompleted(emptyProgress(), 'git/one', true);
  const restored = parseProgress(JSON.stringify(marked));
  assert.equal(courseProgress(restored, ['git/one', 'git/two']).percent, 50);
  assert.deepEqual(setCompleted(restored, 'git/one', false).completed, []);
  assert.deepEqual(setCompleted(restored, 'git/one', true).completed, ['git/one']);
});
test('progress ignores removed lessons and accounts for newly added lessons', () => {
  const state = { version: 1, completed: ['git/one', 'git/removed'], lastVisited: [] };
  assert.equal(courseProgress(state, ['git/one']).percent, 100);
  assert.equal(courseProgress(state, ['git/one', 'git/new']).percent, 50);
});
test('an empty course is not reported as completed', () => {
  assert.deepEqual(courseProgress(emptyProgress(), []), { done: 0, total: 0, percent: 0, resumeId: undefined, started: false, finished: false });
});
test('continue targets an unfinished visited lesson or the first remaining lesson', () => {
  const state = visitLesson(setCompleted(emptyProgress(), 'git/one', true), 'git/three');
  assert.equal(courseProgress(state, ['git/one', 'git/two', 'git/three']).resumeId, 'git/three');
  assert.equal(courseProgress(setCompleted(state, 'git/three', true), ['git/one', 'git/two', 'git/three']).resumeId, 'git/two');
});
test('fully completed courses can be reviewed and visits stay scoped by course', () => {
  const state = visitLesson(visitLesson(visitLesson(emptyProgress(), 'git/one'), 'php/basics/one'), 'git/two');
  assert.deepEqual(state.lastVisited, ['git/two', 'php/basics/one']);
  const result = courseProgress(setCompleted(state, 'git/one', true), ['git/one']);
  assert.equal(result.finished, true);
  assert.equal(result.resumeId, 'git/one');
});
test('storage failures are observable while stored state round-trips normally', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  assert.equal(readProgress(blocked, 'key').error, true);
  assert.equal(saveProgress(blocked, 'key', emptyProgress()), false);
  let value = null;
  const storage = { getItem() { return value; }, setItem(_key, raw) { value = raw; } };
  assert.equal(saveProgress(storage, 'key', setCompleted(emptyProgress(), 'git/one', true)), true);
  assert.deepEqual(readProgress(storage, 'key'), { state: { version: 1, completed: ['git/one'], lastVisited: [] }, error: false });
});
test('progress is shared across locales and isolated across deployment bases', () => {
  assert.equal(progressStorageKey('/'), 'courses:progress:v1:/');
  assert.equal(progressStorageKey('/docs/'), 'courses:progress:v1:/docs');
  assert.equal(progressStorageKey('/docs/'), progressStorageKey('/docs'));
});
