/** @typedef {'ru' | 'en'} Locale */
/** @typedef {{ ru: string, en: string }} Translation */
/** @typedef {{ id: string, title: Translation, description: Translation }} Module */
/** @typedef {'beginner' | 'intermediate' | 'advanced'} Difficulty */
/** @typedef {{ id: string, title: Translation, description: Translation, difficulty?: Difficulty, durationMinutes?: number | null, modules?: Module[] }} Course */
/** @typedef {{ id: string, title: Translation, description: Translation, children?: Category[], courses?: Course[] }} Category */
/** @typedef {{ category: Category, ancestors: Category[], order: number }} CategoryEntry */
/** @typedef {{ course: Course, category: Category, ancestors: Category[], order: number }} CourseEntry */
/** @typedef {{ slug: string, label: string, translations: { en: string } }} SidebarLink */
/** @typedef {{ autogenerate: { directory: string } }} SidebarAutogenerate */
/** @typedef {{ label: string, translations: { en: string }, collapsed: boolean, items: SidebarItem[] }} SidebarGroup */
/** @typedef {SidebarLink | SidebarAutogenerate | SidebarGroup} SidebarItem */
/** @typedef {{ path: string, title: Translation, description: Translation, props: { category?: string, course?: string, module?: string }, order: number }} CatalogPage */

/** Validate authors' data before using IDs as filesystem paths or sidebar slugs.
 * @param {{ id: string, title: Translation, description: Translation }} entry
 * @param {string} kind
 */
function validateEntry(entry, kind) {
  if (!entry || typeof entry.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)) {
    throw new Error(`${kind}: id must contain lowercase Latin letters, numbers and hyphens.`);
  }
  for (const field of /** @type {const} */ (['title', 'description'])) {
    for (const locale of /** @type {Locale[]} */ (['ru', 'en'])) {
      if (typeof entry[field]?.[locale] !== 'string' || !entry[field][locale].trim()) {
        throw new Error(`${kind} "${entry.id}": ${field}.${locale} is required.`);
      }
    }
  }
}

/** Build a complete lookup with ancestors; no application-defined depth limit.
 * @param {Category[]} roots
 */
export function indexCatalog(roots) {
  /** @type {Map<string, CategoryEntry>} */
  const categoryById = new Map();
  /** @type {Map<string, CourseEntry>} */
  const courseById = new Map();
  /** @type {Set<Category>} */
  const visiting = new Set();

  /** @param {Category[]} nodes @param {Category[]} ancestors */
  function visit(nodes, ancestors) {
    if (!Array.isArray(nodes)) throw new Error('Category children must be an array.');
    nodes.forEach((category, order) => {
      if (visiting.has(category)) throw new Error(`Category cycle detected at "${category.id}".`);
      validateEntry(category, 'Category');
      if (categoryById.has(category.id)) throw new Error(`Duplicate category id "${category.id}".`);
      categoryById.set(category.id, { category, ancestors, order });
      visiting.add(category);
      if (category.children !== undefined && !Array.isArray(category.children)) {
        throw new Error(`Category "${category.id}": children must be an array.`);
      }
      if (category.courses !== undefined && !Array.isArray(category.courses)) {
        throw new Error(`Category "${category.id}": courses must be an array.`);
      }
      (category.courses ?? []).forEach((course, courseOrder) => {
        validateEntry(course, 'Course');
        if (course.difficulty !== undefined && !['beginner', 'intermediate', 'advanced'].includes(course.difficulty)) {
          throw new Error(`Course "${course.id}": difficulty must be beginner, intermediate or advanced.`);
        }
        if (course.durationMinutes != null && (!Number.isSafeInteger(course.durationMinutes) || course.durationMinutes <= 0)) {
          throw new Error(`Course "${course.id}": durationMinutes must be a positive integer or null.`);
        }
        if (courseById.has(course.id)) throw new Error(`Duplicate course id "${course.id}".`);
        courseById.set(course.id, { course, category, ancestors, order: courseOrder });
        if (course.modules !== undefined && !Array.isArray(course.modules)) {
          throw new Error(`Course "${course.id}": modules must be an array.`);
        }
        const moduleIds = new Set();
        for (const module of course.modules ?? []) {
          validateEntry(module, 'Module');
          if (moduleIds.has(module.id)) throw new Error(`Duplicate module id "${module.id}" in course "${course.id}".`);
          moduleIds.add(module.id);
        }
      });
      visit(category.children ?? [], [...ancestors, category]);
      visiting.delete(category);
    });
  }

  visit(roots, []);
  return { categoryById, courseById };
}

/** Stable routes deliberately do not include the ancestor path.
 * @param {Category[]} roots
 * @returns {CatalogPage[]}
 */
export function catalogPages(roots) {
  const { categoryById } = indexCatalog(roots);
  /** @type {CatalogPage[]} */
  const pages = [];
  for (const { category, order } of categoryById.values()) {
    pages.push({ path: `directions/${category.id}`, title: category.title, description: category.description, props: { category: category.id }, order });
    (category.courses ?? []).forEach((course, courseOrder) => {
      pages.push({ path: `courses/${course.id}`, title: course.title, description: course.description, props: { course: course.id }, order: courseOrder });
      (course.modules ?? []).forEach((module, moduleOrder) => {
        pages.push({ path: `courses/${course.id}/${module.id}`, title: module.title, description: module.description, props: { course: course.id, module: module.id }, order: moduleOrder });
      });
    });
  }
  return pages;
}

/** @param {Category[]} roots @returns {SidebarGroup[]} */
export function buildSidebar(roots) {
  indexCatalog(roots);
  /** @param {Course} course @returns {SidebarGroup} */
  const courseGroup = (course) => ({
    label: course.title.ru, translations: { en: course.title.en }, collapsed: true,
    items: !(course.modules ?? []).length ? [{ autogenerate: { directory: `courses/${course.id}` } }] : [
      { slug: `courses/${course.id}`, label: 'О курсе', translations: { en: 'About the course' } },
      ...(course.modules ?? []).map((module) => ({
        label: module.title.ru, translations: { en: module.title.en }, collapsed: true,
        items: [{ autogenerate: { directory: `courses/${course.id}/${module.id}` } }],
      })),
    ],
  });
  /** @param {Category} category @returns {SidebarGroup} */
  const categoryGroup = (category) => ({
    label: category.title.ru, translations: { en: category.title.en }, collapsed: true,
    items: [
      { slug: `directions/${category.id}`, label: 'О категории', translations: { en: 'Category overview' } },
      ...(category.children ?? []).map(categoryGroup),
      ...(category.courses ?? []).map(courseGroup),
    ],
  });
  return roots.map(categoryGroup);
}
