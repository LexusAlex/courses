# courses

Каркас сайта курсов по разным темам на Astro + Starlight. Русский и английский интерфейс, каталог направлений, страницы курсов и разделов. Учебных материалов пока нет. Тематика сайта не ограничена программированием: текущие направления можно дополнять курсами из любых областей.

## Структура курсов

```text
Технологии
  Программирование
    Frontend
      HTML и CSS
      JavaScript с нуля
    Backend
      PHP с нуля
        Основы языка
        Функции и массивы
      ООП в PHP
Базы данных
  SQL на практике
Инструменты
  Git
Инфраструктура
  Docker
```

Обе языковые версии содержат одинаковую структуру. Категории поддерживают вложенность без заданного ограничения глубины. В каждой категории могут одновременно находиться подкатегории и курсы. Все курсы помечены «В подготовке» / “In preparation”.

## Локальный запуск

Требуются Node.js 24 и pnpm 11.25.0. Версии записаны в `.node-version` и `package.json`.

```bash
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

Открыть <http://localhost:4321/ru/> или <http://localhost:4321/en/>.

```bash
pnpm check
pnpm test
pnpm build
pnpm verify
pnpm preview
```

`pnpm test` проверяет вложенность (в том числе дерево из 31 категории), переводы, переносы, ошибки данных и сохранность авторских файлов. `pnpm verify` проверяет актуальные страницы каталога на двух языках, полные цепочки навигации, соответствие маршрутов, внутренние ссылки, ресурсы и поддержку подкаталога. `dist/` содержит результат статической сборки.

## Файлы проекта

```text
astro.config.mjs               # Языки, меню, URL и путь публикации
src/data/catalog.mjs          # Дерево категорий, курсы, разделы и переводы
src/data/catalog-tree.mjs     # Обход дерева, проверка данных, маршруты и меню
src/components/Catalog.astro  # Карточки и страницы структуры
src/content/docs/ru/          # Русские страницы
src/content/docs/en/          # Английские страницы с теми же путями
src/styles/custom.css        # Оформление
scripts/scaffold-content.mjs  # Создание отсутствующих страниц структуры
scripts/verify-build.mjs      # Проверка результата сборки
docker/                      # Nginx для Linux
.github/workflows/            # Проверка и будущая публикация
```

`pnpm scaffold` создаёт только отсутствующие страницы структуры и никогда не перезаписывает существующие файлы. Он также выполняется перед разработкой и сборкой. При изменении названий в каталоге уже существующие заголовки MDX нужно обновить отдельно.

## Как редактировать курсы

Открой папку `courses/` в редакторе кода, например VS Code. Сейчас курсы редактируются в файлах; административной панели в каркасе нет. Для просмотра изменений запусти `pnpm dev` и открой <http://localhost:4321/ru/>. Изменения исходников отображаются в режиме разработки автоматически.

Структура каталога: **категория → подкатегория → … → курс → раздел → урок**. Направление — это категория верхнего уровня. Вложенные категории задаются полем `children`; в нём можно повторять такую же структуру на любой глубине. Курсы категории записываются в `courses`. Оба поля необязательные: можно создать пустую категорию или разместить в ней одновременно подкатегории и курсы.

Названия и описания для двух языков записываются рядом: `t('Русский текст', 'English text')`. Один объект в каталоге управляет меню, карточками и навигационной цепочкой сразу для RU и EN. Тексты уроков и страниц хранятся в отдельных файлах двух языков; переводы нужно писать самостоятельно.

Правила идентификаторов `id`:

- Только строчные латинские буквы, цифры и дефисы, например `photography` или `camera-basics`.
- ID категории должен быть уникален среди **всех категорий**, даже в разных ветках.
- ID курса должен быть уникален среди **всех курсов**.
- ID раздела должен быть уникален внутри своего курса; у разных курсов раздел `basics` допустим.
- `title` и `description` обязательны на обоих языках. Команды создания страниц и сборки сообщают об отсутствующих переводах, дубликатах ID и циклических ссылках в дереве.

### Изменить название или описание

1. В `src/data/catalog.mjs` найди нужную категорию, курс или раздел в дереве `categories` и измени `title` и `description`. Для подкатегорий раскрой соответствующие массивы `children`. Здесь задаются тексты карточек, групп меню и навигационной цепочки.
2. Обнови `title` и `description` в начале соответствующих файлов `index.mdx` для обоих языков. Если описание также написано под строкой `import Catalog ...`, обнови и этот текст — он виден на странице.
3. Проверь обе языковые версии в браузере.

Например, страница курса PHP хранится в `src/content/docs/ru/courses/php/index.mdx` и `src/content/docs/en/courses/php/index.mdx`. Страница категории Backend — в `src/content/docs/{ru,en}/directions/backend/index.mdx`. Страница раздела PHP — в `src/content/docs/{ru,en}/courses/php/basics/index.mdx`. Запись `{ru,en}` означает две отдельные папки.

**Изменение каталога не перезаписывает существующие MDX-файлы.** Поэтому заголовки и описания уже созданных страниц нужно менять отдельно в обеих языковых версиях. Новые страницы создаются из текущих данных каталога.

Главная страница редактируется в `src/content/docs/ru/index.mdx` и `src/content/docs/en/index.mdx`. Заголовки и вводный текст для новых страниц также задаются в объекте `ui` файла `src/data/catalog.mjs`. Название сайта `courses` и общее описание находятся в `astro.config.mjs`.

### Добавить категорию и вложенные подкатегории

В `src/data/catalog.mjs` добавь объект в корневой массив `categories` для нового направления или в `children` существующей категории для подкатегории. Например:

```js
{
  id: 'creativity',
  title: t('Творчество', 'Creativity'),
  description: t('Творческие занятия и навыки.', 'Creative activities and skills.'),
  children: [
    {
      id: 'photography',
      title: t('Фотография', 'Photography'),
      description: t('Съёмка, свет и обработка фотографий.', 'Photography, lighting, and photo editing.'),
      children: [
        {
          id: 'digital-photography',
          title: t('Цифровая фотография', 'Digital photography'),
          description: t('Работа с цифровой камерой.', 'Working with a digital camera.'),
          courses: [
            {
              id: 'photography-basics',
              title: t('Основы фотографии', 'Photography basics'),
              description: t('Знакомство с камерой и композицией.', 'An introduction to cameras and composition.'),
              modules: [],
            },
          ],
        },
      ],
    },
  ],
},
```

Затем из папки проекта выполни:

```bash
pnpm scaffold
```

Команда обойдёт всё дерево и создаст недостающие страницы категорий и курсов на обоих языках. Подкатегории появятся в боковом меню и карточках родительской категории. На вложенных страницах будет полная цепочка: «Каталог курсов → Творчество → Фотография → Цифровая фотография → Основы фотографии».

Дальнейшая вложенность добавляется ещё одним массивом `children` на нужном уровне. Менять код меню или компонентов для каждого уровня не нужно. Чтобы добавить курс в существующую категорию, скопируй только объект курса в её массив `courses`.

В каждой категории сначала показываются подкатегории, затем её курсы. Внутри каждого массива порядок карточек и групп меню совпадает с порядком объектов. Пустая категория тоже получает страницу с сообщением, что материалы будут добавлены позже.

### Где находятся страницы вложенных категорий

Адрес определяется ID, а не цепочкой родителей. Для примера выше:

```text
/ru/directions/creativity/
/ru/directions/photography/
/ru/directions/digital-photography/
/ru/courses/photography-basics/
```

Английские страницы используют `/en/` и те же ID. Исходник категории `digital-photography` находится в `src/content/docs/{ru,en}/directions/digital-photography/index.mdx`. Папки категорий не нужно вкладывать друг в друга: иерархия задаётся только в `categories` и `children`.

Новые структурные страницы используют `<Catalog category="digital-photography" />`. Ранее созданные страницы с `<Catalog area="backend" />` продолжают работать.

### Добавить раздел курса

В массив `modules` выбранного курса добавь объект:

```js
{
  id: 'camera-basics',
  title: t('Знакомство с камерой', 'Getting to know your camera'),
  description: t('Подготовка к первым занятиям.', 'Getting ready for the first lessons.'),
},
```

Повтори `pnpm scaffold`. Для курса из примера появятся файлы `src/content/docs/ru/courses/photography-basics/camera-basics/index.mdx` и такой же путь в папке `en/`. Меню раздела уже настроено на автоматическое добавление будущих уроков из этой папки. Если меняешь порядок страниц внутри такого раздела, используй `sidebar.order` в их frontmatter.

### Перенести, переименовать или удалить категорию и курс

Для переноса категории перемести весь её объект из одного массива `children` в другой или между корневым массивом `categories` и `children`. Для переноса курса перемести его объект между массивами `courses`. **Сохрани ID:** адреса и исходные файлы останутся прежними, а меню и цепочка родителей обновятся после пересборки. Все вложенные категории и курсы перемещаются вместе с объектом родителя.

Переименование `title` не меняет адрес. Для изменения адреса нужно изменить `id`, переименовать соответствующие папки на обоих языках и обновить ID в `<Catalog category="..." />` (или старом `area`), `<Catalog course="..." />` либо `module` внутри этих страниц. При переименовании ID курса обнови `course` также на страницах всех его разделов.

При удалении курса убери объект из `courses` и его папки из `src/content/docs/ru/courses/` и `src/content/docs/en/courses/`. При удалении категории убери её объект из дерева и страницы в `directions/` обоих языков. Если удаляется целая ветка, удали страницы **каждой** её вложенной категории и курсов, либо предварительно перенеси их в другую категорию. Сначала сохрани нужные авторские материалы.

`pnpm scaffold` не удаляет и не переносит старые файлы. Проверка `pnpm verify` сама получает список обязательных маршрутов из текущего дерева — вручную менять список маршрутов и число страниц больше не нужно. Проверь ссылки на удалённые/переименованные страницы; после публикации старые адреса лучше сохранить через редиректы.

### Проверить изменения и обновить production-просмотр

```bash
pnpm check
pnpm test
pnpm build
pnpm verify
pnpm preview --host 127.0.0.1 --port 4322
```

Production-просмотр доступен по адресу <http://127.0.0.1:4322/ru/>. В нём показывается результат последней сборки; после правок нужно снова выполнить `pnpm build`. Нижней панели разработчика в production нет. Эти команды работают локально, ничего не публикуют и не запускают Docker.

### Editing categories (English)

Edit `categories` in `src/data/catalog.mjs`. A category has a unique `id`, bilingual `title` and `description`, optional `children` (nested categories) and optional `courses`. Repeat `children` at any depth. A category may contain both children and courses, or remain empty. Use `t('Russian text', 'English text')` for each translated field; lesson text is translated manually in separate RU/EN files.

Run `pnpm scaffold` after adding entries. It generates missing pages in `src/content/docs/ru/` and `src/content/docs/en/` without overwriting existing content. Update existing MDX frontmatter and visible descriptions separately when renaming entries. Category IDs are unique across the entire tree; course IDs are unique across all categories; module IDs are unique within their course. IDs use lowercase Latin letters, numbers and hyphens.

Move a category object between `children` arrays (or the root `categories` array), or a course between `courses` arrays, without changing its ID. Routes stay `/ru/directions/<id>/` and `/ru/courses/<id>/` (with matching `/en/` versions); menus and breadcrumbs follow the new hierarchy. Delete obsolete source pages in both languages when deleting entries. Keep source folders flat; the category hierarchy belongs in the data, not the directory layout. Run `pnpm test`, `pnpm check`, `pnpm build` and `pnpm verify` before publishing.

## Языки и будущие уроки

Переключатель языка открывает соответствующую страницу другого языка. Переводы хранятся в отдельных файлах. Например, будущий урок можно добавить в:

```text
src/content/docs/ru/courses/php/basics/variables.md
src/content/docs/en/courses/php/basics/variables.md
```

В начале Markdown-файла задаются `title`, `description` и `sidebar.order`. В модулях PHP меню автоматически подхватывает новые файлы. Для уроков других курсов можно добавить `autogenerate` в функцию `sidebar()` в `src/data/catalog.mjs`, либо сначала добавить модули в данные курса. Общая структура меняется в одном файле каталога.

Заголовки групп меню переводятся через `translations`. Названия автоматически добавленных страниц берутся из их переведённого frontmatter. Пока на структурных страницах переходы «Предыдущая/Следующая» выключены; при добавлении уроков их можно включить и задать границы каждого курса.

## Адрес и подкаталог

Скопировать `.env.example` в `.env`:

```bash
cp .env.example .env
```

Для сайта в корне домена:

```dotenv
SITE_URL=https://lexusalex.ru
SITE_BASE=/
HTTP_PORT=8080
```

Для сохранения пути `/docs/`:

```dotenv
SITE_URL=https://lexusalex.ru
SITE_BASE=/docs/
HTTP_PORT=8080
```

После изменения `SITE_BASE` или `SITE_URL` сайт нужно пересобрать. Внешние переменные окружения имеют приоритет над `.env`. Файл `.env` не попадает в Git и Docker image. Переменные `SITE_URL` и `SITE_BASE` публичные и не содержат секретов.

## Docker на Linux

Инфраструктура подготовлена; Docker и контейнеры в рамках создания каркаса не запускаются. На сервере нужны Docker Engine и плагин Docker Compose.

Запуск production по запросу владельца:

```bash
cp .env.example .env
docker compose up --detach --build
```

Сайт будет доступен на `http://SERVER:8080/ru/`, либо `http://SERVER:8080/docs/ru/` при `SITE_BASE=/docs/`.

```bash
docker compose logs --follow web
docker compose ps
docker compose down
```

Сборка многоэтапная: Node собирает статические страницы, Nginx обслуживает результат. Production-процесс работает от пользователя `nginx`, без Node и базы данных. Проверка доступности — `/healthz`; неизвестные страницы возвращают HTTP 404. За HTTPS отвечает внешний reverse proxy на Linux-сервере.

После обновления исходников повторить `docker compose up --detach --build`. Смена публичного адреса или подкаталога также требует пересборки.

Для разработки внутри Docker:

```bash
docker compose -f compose.dev.yaml up --build
```

Исходники подключаются через volume, зависимости — через отдельный named volume, порт — `4321`. Если зависимости изменились, обновить их командой `docker compose -f compose.dev.yaml run --rm dev pnpm install --frozen-lockfile`, затем пересобрать и перезапустить dev-сервис.

## GitHub Actions — подготовлено, не опубликовано

Загрузить содержимое папки `courses/` в корень будущего отдельного репозитория. Пока репозиторий и публикация не создаются.

- `check.yml` проверяет тесты дерева категорий, типы, сборку, переводы, навигационные цепочки, ссылки и оба пути `/` и `/docs/`. Отдельный job проверяет Docker-образ на GitHub runner, когда workflow будет запущен в будущем.
- `deploy-pages.yml` публикует на GitHub Pages **только по ручному запуску** `workflow_dispatch`. Автоматической публикации при push нет.

Когда публикация понадобится:

1. Загрузить проект в выбранный репозиторий, включая `pnpm-lock.yaml`.
2. В Settings → Pages выбрать Source: GitHub Actions.
3. В Actions вручную запустить “Publish courses to GitHub Pages”.

Workflow получает домен и подкаталог от `actions/configure-pages`, поэтому подходит для адреса `USERNAME.github.io/REPOSITORY/` и собственного домена, настроенного в Pages. Никакие личные токены в файлы не добавлены.

Если нужен автоматический выпуск при push в `main`, позже добавить `push: { branches: [main] }` в `on` файла `deploy-pages.yml`. Сборка на GitHub Pages и Docker на своём Linux-сервере — два независимых способа размещения.
