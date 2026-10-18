import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportProgress, importProgress, mergeProgress, emptyProgress, MAX_BACKUP_BYTES } from '../src/lib/progress.mjs';
import { indexCatalog } from '../src/data/catalog-tree.mjs';

const state = { version: 1, completed: ['php/basics/first-program'], lastVisited: ['php/basics/first-program'] };
const entry = (id, extra = {}) => ({ id, title: { ru: 'Название', en: 'Title' }, description: { ru: 'Описание', en: 'Description' }, ...extra });

test('a downloaded progress backup restores stable lesson IDs without a locale', () => {
  const backup = exportProgress(state);
  assert.deepEqual(importProgress(backup), state);
  assert.equal(JSON.parse(backup).format, 'courses-progress');
});

test('import rejects corrupt, unrelated and unsupported files instead of resetting progress', () => {
  for (const value of ['{', '{}', 'null', JSON.stringify({ format: 'courses-progress', version: 2, state }), JSON.stringify({ format: 'courses-progress', version: 1, state: { ...state, completed: [23] } })]) {
    assert.throws(() => importProgress(value), /backup/i);
  }
  assert.throws(() => importProgress(' '.repeat(MAX_BACKUP_BYTES + 1)), /size/i);
  assert.deepEqual(state.completed, ['php/basics/first-program']);
});

test('import merges completions and keeps one recent lesson for each course', () => {
  const current = { version: 1, completed: ['php/basics/one'], lastVisited: ['php/basics/one', 'photo/start'] };
  const incoming = { version: 1, completed: ['php/basics/two', 'php/basics/one'], lastVisited: ['php/basics/two'] };
  assert.deepEqual(mergeProgress(current, incoming), { version: 1, completed: ['php/basics/one', 'php/basics/two'], lastVisited: ['php/basics/two', 'photo/start'] });
  assert.deepEqual(mergeProgress(current, emptyProgress()), current);
});

test('course learning goals require both languages and nonempty text', () => {
  for (const field of ['audience', 'prerequisites', 'outcomes']) {
    for (const value of [{ ru: ['Текст'] }, { ru: [], en: ['Text'] }, { ru: ['Текст'], en: [23] }]) {
      assert.throws(() => indexCatalog([entry('backend', { courses: [entry('php', { [field]: value })] })]), new RegExp(field));
    }
  }
  assert.equal(indexCatalog([entry('backend', { courses: [entry('php', { outcomes: { ru: ['Писать программы'], en: ['Write programs'] } })] })]).courseById.size, 1);
});
