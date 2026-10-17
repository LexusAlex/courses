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
    id: 'technology', title: t('Технологии', 'Technology'),
    description: t('Курсы по технологиям и программированию.', 'Courses in technology and programming.'),
    children: [
      {
        id: 'programming', title: t('Программирование', 'Programming'),
        description: t('Языки программирования и разработка приложений.', 'Programming languages and application development.'),
        children: [
          {
            id: 'frontend', title: t('Frontend', 'Frontend'),
            description: t('Разработка интерфейсов: от структуры страницы до JavaScript.', 'Build interfaces, from page structure to JavaScript.'),
            courses: [
              { id: 'html-css', title: t('HTML и CSS', 'HTML and CSS'), description: t('Структура документов, стили и адаптивная вёрстка.', 'Document structure, styling, and responsive layouts.'), modules: [] },
              { id: 'javascript', title: t('JavaScript с нуля', 'JavaScript from scratch'), description: t('Основы языка и работа со страницей в браузере.', 'Language fundamentals and working with browser pages.'), modules: [] },
            ],
          },
          {
            id: 'backend', title: t('Backend', 'Backend'),
            description: t('Серверная разработка на PHP и организация кода.', 'Server-side PHP development and code organization.'),
            courses: [
              {
                id: 'php', title: t('PHP с нуля', 'PHP from scratch'),
                description: t('Последовательное знакомство с языком PHP.', 'A step-by-step introduction to the PHP language.'),
                modules: [
                  { id: 'basics', title: t('Основы языка', 'Language basics'), description: t('Раздел для первых уроков по синтаксису PHP.', 'A section for introductory PHP syntax lessons.') },
                  { id: 'functions', title: t('Функции и массивы', 'Functions and arrays'), description: t('Раздел для уроков по функциям и работе с массивами.', 'A section for lessons on functions and arrays.') },
                ],
              },
              { id: 'php-oop', title: t('ООП в PHP', 'OOP in PHP'), description: t('Классы, объекты, интерфейсы и организация приложений.', 'Classes, objects, interfaces, and application structure.'), modules: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'databases', title: t('Базы данных', 'Databases'),
    description: t('Реляционные базы данных и работа с SQL.', 'Relational databases and working with SQL.'),
    courses: [
      { id: 'sql', title: t('SQL на практике', 'Practical SQL'), description: t('Запросы, связи таблиц и работа с данными.', 'Queries, table relationships, and working with data.'), modules: [] },
    ],
  },
  {
    id: 'tools', title: t('Инструменты', 'Tools'),
    description: t('Инструменты повседневной работы разработчика.', 'Tools for everyday development.'),
    courses: [
      { id: 'git', title: t('Git', 'Git'), description: t('История изменений, ветки и совместная работа.', 'Change history, branches, and collaboration.'), modules: [] },
    ],
  },
  {
    id: 'infrastructure', title: t('Инфраструктура', 'Infrastructure'),
    description: t('Окружение для запуска и развертывания приложений.', 'Environments for running and deploying applications.'),
    courses: [
      { id: 'docker', title: t('Docker', 'Docker'), description: t('Образы, контейнеры и Docker Compose.', 'Images, containers, and Docker Compose.'), modules: [] },
    ],
  },
];

export const ui = {
  ru: {
    catalog: 'Каталог курсов', title: 'Каталог курсов',
    intro: 'Курсы по разным направлениям. Выбери интересующую тему. Материалы будут появляться по мере подготовки.',
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
    intro: 'Courses across different subjects. Choose a topic that interests you. Materials will be added as they are prepared.',
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
