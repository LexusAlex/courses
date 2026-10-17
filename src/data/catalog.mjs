/** @typedef {'ru' | 'en'} Locale */
/** @typedef {{ ru: string, en: string }} Translation */
/** @typedef {import('./catalog-tree.mjs').Category} Category */
import { buildSidebar } from './catalog-tree.mjs';

/** @type {Locale[]} */
export const locales = ['ru', 'en'];

/** @param {string} ru @param {string} en @returns {Translation} */
const t = (ru, en) => ({ ru, en });

/** @type {Category[]} */
export const categories = [
  {
    id: 'backend', title: t('Backend сервер', 'Backend server'),
    description: t('Серверная разработка и языки для backend.', 'Server-side development and backend languages.'),
    courses: [
      {
        id: 'php', difficulty: 'beginner', durationMinutes: null, title: t('PHP', 'PHP'),
        description: t('PHP с нуля: синтаксис, функции и массивы. Начни с первого тестового урока.', 'PHP from scratch: syntax, functions, and arrays. Start with the first sample lesson.'),
        modules: [
          { id: 'basics', title: t('Основы языка', 'Language basics'), description: t('Раздел для первых уроков по синтаксису PHP.', 'A section for introductory PHP syntax lessons.') },
          { id: 'functions', title: t('Функции и массивы', 'Functions and arrays'), description: t('Раздел для уроков по функциям и работе с массивами.', 'A section for lessons on functions and arrays.') },
        ],
      },
    ],
  },
];

export const ui = {
  ru: {
    catalog: 'Каталог курсов', title: 'Каталог курсов',
    intro: 'Изучай новое на практике и сохраняй свой прогресс прямо в браузере.',
    directions: 'Направления',
    preparing: 'В подготовке', viewCourses: 'Смотреть курсы', viewCourse: 'Программа курса',
    modules: 'Разделы курса', openModule: 'Открыть раздел', back: 'Назад к курсу',
    emptyTitle: 'Уроков пока нет', emptyBody: 'Этот раздел подготовлен для будущих материалов.',
    courseEmpty: 'Курс находится в подготовке. Разделы и уроки будут добавлены позже.',
    modulePrefix: 'Раздел курса', coursePrefix: 'Курс',
    categoryPrefix: 'Категория', subcategories: 'Подкатегории', courses: 'Курсы',
    openCategory: 'Открыть категорию', categoryEmpty: 'Категория пока пуста',
    categoryEmptyBody: 'Подкатегории и курсы будут добавлены позже.',
  },
  en: {
    catalog: 'Course catalog', title: 'Course catalog',
    intro: 'Learn through practice and save your progress in this browser.',
    directions: 'Subjects',
    preparing: 'In preparation', viewCourses: 'Browse courses', viewCourse: 'Course outline',
    modules: 'Course sections', openModule: 'Open section', back: 'Back to course',
    emptyTitle: 'No lessons yet', emptyBody: 'This section is ready for future materials.',
    courseEmpty: 'This course is in preparation. Sections and lessons will be added later.',
    modulePrefix: 'Course section', coursePrefix: 'Course',
    categoryPrefix: 'Category', subcategories: 'Subcategories', courses: 'Courses',
    openCategory: 'Explore category', categoryEmpty: 'This category is empty',
    categoryEmptyBody: 'Subcategories and courses will be added later.',
  },
};

/** Paths are locale-independent. Starlight adds locale and deployment base. */
export function sidebar() {
  return buildSidebar(categories);
}
