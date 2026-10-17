# courses

Сайт курсов на Astro + Starlight с русским и английским интерфейсом. Сейчас оставлен только курс **PHP** с первым тестовым уроком. Каталог по-прежнему поддерживает направления из любых областей и категории любой глубины.

## Структура курсов

```text
Backend сервер / Backend server
  PHP
    Основы языка / Language basics
      Урок 1. Первая программа на PHP
    Функции и массивы / Functions and arrays
```

Обе языковые версии содержат одинаковую структуру. Категории поддерживают вложенность без заданного ограничения глубины. В каждой категории могут одновременно находиться подкатегории и курсы. PHP имеет статус «Доступен» / “Available”, поскольку в нём есть урок; раздел «Функции и массивы» пока пуст. Длительность курса остаётся «Уточняется».

## Локальный запуск

Требуются Node.js 24 и pnpm 11.25.0. Версии записаны в `.node-version` и `package.json`. Для `pnpm test` также нужен `curl` с поддержкой `--retry-all-errors` (7.71 или новее): тест проверяет готовность HTTP-сервиса без Docker.

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

## Быстрые команды Makefile

Команды выполняются из папки проекта. Дополнительно к Node.js и pnpm нужен **GNU Make**. На Ubuntu/Debian его можно установить командой `sudo apt install make`. В Windows понадобится отдельный GNU Make либо Linux-окружение WSL; обычный PowerShell сам по себе не предоставляет команду `make`. Все исходные команды `pnpm` продолжают работать без Make.

```bash
make                 # Справка; ничего не запускает
make install         # Установить зависимости из lockfile
make dev             # Разработка: http://127.0.0.1:4321/ru/
make serve           # Собрать и открыть production-сервер на порту 4322
make validate        # check → test → build → verify, последовательно
```

`make serve` запускает сервер; страницу нужно открыть в браузере. Остановка сервера — `Ctrl+C`.

| Команда | Назначение |
| --- | --- |
| `make scaffold` | Создать отсутствующие страницы структуры RU/EN |
| `make build` | Собрать статические файлы в `dist/` |
| `make preview` | Запустить просмотр уже собранного `dist/` |
| `make check` | Проверить Astro и TypeScript |
| `make test` | Выполнить автоматические тесты |
| `make verify` | Проверить ссылки и навигацию существующей сборки |
| `make docker-config` | Проверить оба Compose-файла без запуска контейнеров |
| `make docker-build` | Собрать production-образ |
| `make docker-up` | Собрать и запустить production в Docker |
| `make docker-down` | Остановить production, сохранив volumes |
| `make docker-logs` | Смотреть логи production |
| `make docker-dev` | Собрать и запустить разработку в Docker |
| `make docker-dev-down` | Остановить разработку в Docker, сохранив volumes |

По умолчанию локальные серверы доступны только с этого компьютера. Хост, порты и команды можно переопределить:

```bash
make dev HOST=0.0.0.0 DEV_PORT=4323
make preview PREVIEW_PORT=4324
make validate PNPM=pnpm
```

`make start` — синоним `make dev`, `make ci` — синоним `make validate`. У `validate` нет скрытой установки зависимостей или запуска Docker. Все Docker-команды запускаются только при явном выборе соответствующей цели. Для production-сайта в `/courses/` сначала настрой `.env` и затем выполни `make build`.

## Файлы проекта

```text
astro.config.mjs               # Языки, меню, URL и путь публикации
Makefile                      # Быстрые локальные команды и отдельные цели Docker
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

Открой папку `courses/` в редакторе кода, например VS Code. Сейчас курсы редактируются в файлах; административной панели в каркасе нет. Для просмотра изменений запусти `pnpm dev` и открой <http://localhost:4321/ru/>. Изменения текстов и стилей отображаются в режиме разработки автоматически. После изменения дерева в `src/data/catalog.mjs` выполни `pnpm scaffold` и перезапусти dev-сервер (`Ctrl+C`, затем `make dev` или `pnpm dev`), чтобы боковое меню из конфигурации Starlight перечиталось.

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

Например, страница курса PHP хранится в `src/content/docs/ru/courses/php/index.mdx` и `src/content/docs/en/courses/php/index.mdx`. Страница категории Backend сервер — в `src/content/docs/{ru,en}/directions/backend/index.mdx`. Страница раздела PHP — в `src/content/docs/{ru,en}/courses/php/basics/index.mdx`. Запись `{ru,en}` означает две отдельные папки.

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

## Первый тестовый урок и переводы

Первый урок уже создан в двух файлах:

```text
src/content/docs/ru/courses/php/basics/first-program.md
src/content/docs/en/courses/php/basics/first-program.md
```

Он содержит проверку версии PHP, запуск `hello.php` из терминала, пример кода с результатом, задание, раскрываемое решение и вопросы для самопроверки. Это пробный материал для проверки оформления и прогресса. Для запуска приведённого кода нужен установленный PHP; для запуска самого сайта PHP не требуется. У единственного урока нет ссылок «Предыдущий» и «Следующий»; они появятся при добавлении следующих уроков.

Адреса урока: `/ru/courses/php/basics/first-program/` и `/en/courses/php/basics/first-program/`. Обновляй оба файла при редактировании. Не меняй путь без необходимости: он используется для связи переводов и сохранения прогресса.

### Добавить следующие уроки

Переключатель языка открывает соответствующую страницу другого языка. Переводы хранятся в отдельных файлах. Например, будущий урок можно добавить в:

```text
src/content/docs/ru/courses/php/basics/variables.md
src/content/docs/en/courses/php/basics/variables.md
```

В начале Markdown-файла задаются `title`, `description` и `sidebar.order`. Меню автоматически подхватывает уроки: в курсе с разделами — из папки каждого объявленного раздела, а в курсе без разделов — непосредственно из папки курса. Для текущего PHP используй папки `courses/php/basics/` и `courses/php/functions/` в обоих языках. Дописывать пункты меню для каждого урока не требуется.

Заголовки групп меню переводятся через `translations`. Названия автоматически добавленных страниц берутся из их переведённого frontmatter. На структурных страницах переходы «Предыдущая/Следующая» выключены. На уроках собственные переходы появляются автоматически, остаются внутри текущего курса и языка и не ведут на страницы обзора.

## Сложность и длительность курса

В объекте курса внутри `src/data/catalog.mjs` можно задать:

```js
{
  id: 'photography-basics',
  title: t('Основы фотографии', 'Photography basics'),
  description: t('Знакомство с камерой и композицией.', 'An introduction to cameras and composition.'),
  difficulty: 'beginner',
  durationMinutes: 150,
  modules: [],
},
```

- `difficulty`: `beginner` — начальный, `intermediate` — средний, `advanced` — продвинутый. Если поле пропущено, выводится «Не указана» / “Not specified”.
- `durationMinutes`: целое положительное число минут. Например, `150` отображается как «2 ч 30 мин» / “2 h 30 min”. Значение `null` или отсутствие поля означает «Длительность уточняется» / “Duration to be confirmed”.
- Эти значения общие для RU и EN, подписи переводятся автоматически. Сейчас для PHP время оставлено `null`; автор задаёт длительность после подготовки полной программы. Начальный уровень сложности можно изменить.

Метаданные видны в карточке и на странице курса. Менять MDX-файлы при изменении сложности или длительности не нужно. Пересобери сайт для обновления production-просмотра.

## Фильтры каталога

На главной странице показаны все курсы; первый выделен отдельным блоком перед направлениями. На странице категории список охватывает её курсы и курсы **всех вложенных подкатегорий**.

Можно одновременно фильтровать по словам в названии/описании/названиях категорий, по категории с её поддеревом, сложности и длительности. Для времени предусмотрены интервалы: до 120 минут включительно, свыше 120 до 480 минут включительно, свыше 480 минут и отдельный вариант «Уточняется». Кнопка «Сбросить фильтры» возвращает полный список. Количество найденных курсов обновляется сразу; пустой результат сопровождается сообщением.

Фильтры работают в браузере без запросов на сервер. Без JavaScript все карточки и ссылки остаются доступными, интерактивные поля не показываются.

### Главная страница и оформление

Первый курс в порядке каталога выделяется на главной странице крупной карточкой перед направлениями и фильтрами. Кнопка «Начать курс» открывает первый доступный урок; сохранённый прогресс меняет её на «Продолжить» или «Повторить курс». У пустого курса кнопки начала нет — доступна ссылка на программу. Логику прогресса использует общий компонент `CourseProgress.astro`, поэтому главная и страница курса показывают одинаковое состояние.

Когда курс один, блок «Подбор курса» свёрнут. Нажми на его заголовок или используй `Tab` и `Enter`, чтобы раскрыть фильтры. При нескольких курсах блок открыт по умолчанию. Если свернуть его после фильтрации, подпись «Фильтры применены» напомнит об активных условиях. Без JavaScript сохраняются все ссылки на курсы и первый урок.

Оформление карточек, главной, кнопок и встроенных фрагментов кода находится в `src/styles/custom.css`. Сам выделенный блок — в `src/components/FeaturedCourse.astro`. Контрастные палитры блоков кода `github-light` и `github-dark`, размер текста и рамки задаются через `expressiveCode` в `astro.config.mjs`; тема переключается вместе с интерфейсом Starlight. Для смены палитры обнови конфигурацию и пересобери сайт. Русский и английский интерфейсы используют одинаковую структуру и оформление.

## Уроки, переходы и порядок прохождения

Пример будущего урока `src/content/docs/ru/courses/php/basics/variables.md`:

```markdown
---
title: Переменные
description: Переменные и присваивание значений.
sidebar:
  order: 10
---

Текст урока.
```

Английский перевод хранится в `src/content/docs/en/courses/php/basics/variables.md` с английскими `title`, `description` и текстом. Пути после `/ru/` и `/en/` должны совпадать; используй одинаковый `sidebar.order`, чтобы порядок совпадал в обоих языках.

Сайт сам определяет уроки по расположению в папке известного курса. Списки уроков появляются на странице курса и соответствующего раздела. Служебные страницы из каталога (главная курса и обзоры разделов), `draft: true` и `sidebar.hidden: true` не учитываются в прохождении. Пока в курсе нет опубликованных уроков, он имеет статус «В подготовке»; при их появлении — «Доступен».

Порядок: разделы идут в порядке массива `modules`, внутри раздела — по `sidebar.order` от меньшего к большему. Файлы без `order` идут после явно упорядоченных; при равенстве учитывается алфавитный порядок пути. Вложенные папки идут группами, с весом самого раннего урока в папке, как в автоматически созданном боковом меню. Лучше задавать явные порядковые номера с шагом 10.

Если у курса объявлены разделы, клади уроки в папку одного из этих разделов. Если разделов нет, клади уроки в папку курса. Первый урок не имеет ссылки на предыдущий, последний — на следующий. Переход между разделами одного курса работает; переход на урок другого курса не создаётся. Вручную задавать `prev` и `next` не нужно: стандартная пагинация Starlight выключена, переходами уроков управляет `LessonContent.astro`.

## Прогресс в браузере

Внизу урока находится отметка «Урок пройден». Её можно установить или снять. На странице курса и карточке показываются число пройденных опубликованных уроков и процент. Кнопка «Начать курс» меняется на «Продолжить», а после завершения — на «Повторить курс».

Последний открытый непройденный урок становится целью «Продолжить»; если он уже пройден, выбирается первый оставшийся урок. Простое открытие страницы не отмечает урок пройденным. Изменения обновляются и в других открытых вкладках сайта.

Прогресс хранится в `localStorage` этого браузера. Русский и английский варианты с одинаковыми путями используют общую отметку. В проценте учитываются только уроки, доступные в текущем языке: удалённые уроки не увеличивают процент, добавление нового урока увеличивает объём курса. Пустой курс не считается пройденным и не показывает ложные 100%.

Данные не отправляются на сервер, аккаунтов нет. Между устройствами прогресс не переносится; очистка данных сайта удалит отметки. Разные домены, порты и префиксы размещения (`/`, `/courses/`) имеют отдельное хранилище. При переименовании пути файла его отметка не переносится автоматически. Если браузер запрещает чтение или запись хранилища, появляется сообщение «Прогресс не сохранён», а чтение урока и переходы продолжают работать.

### Learning features (English)

Set `difficulty` to `beginner`, `intermediate` or `advanced` and `durationMinutes` to a positive integer (or `null` for an unknown duration) in the course object. Cards and course pages format these values for the active language. Filters combine text, category subtree, difficulty and duration; reset restores the full course list. All links remain usable without JavaScript.

Add matching `.md`/`.mdx` lessons under `src/content/docs/{ru,en}/courses/<course>/<module>/`, or directly under the course if it has no modules. Keep matching paths and `sidebar.order` values in both languages. Course modules follow catalog order; lessons follow `sidebar.order` and then path order. Overview, draft and sidebar-hidden pages are excluded. Lists and previous/next links are generated automatically and stay within the course and language.

Completion is explicit and reversible using the lesson checkbox. Course percentages, last-visited resume links and completed IDs are stored locally in the browser, shared between language versions of the same lesson. No account or server synchronization is used. Different origins/deployment bases have separate progress; clearing browser data removes it. Renaming a lesson path does not migrate its completion. Missing translations are not counted in that language, and storage errors are shown without breaking navigation.

## Адрес и подкаталог

Целевой production-адрес — **https://lexusalex.ru/courses/**. Скопировать `.env.example` в `.env`:

```bash
cp .env.example .env
```

Настройки для production:

```dotenv
SITE_URL=https://lexusalex.ru
SITE_BASE=/courses/
HTTP_PORT=8080
```

После публикации `/courses/` перенаправляет на русский каталог `/courses/ru/`; английский каталог находится в `/courses/en/`. Страница курса PHP — `/courses/ru/courses/php/`. Все ссылки, поиск, ресурсы, sitemap и канонические URL используют этот префикс.

Без `.env` локальная разработка по-прежнему использует корень `/`. Если production-настройки уже скопированы в `.env`, локальные адреса будут `http://localhost:4321/courses/ru/` и `http://127.0.0.1:4322/courses/ru/`. Для локального просмотра в корне задай:

```dotenv
SITE_URL=https://lexusalex.ru
SITE_BASE=/
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

С настройками `.env.example` сайт будет доступен на `http://SERVER:8080/courses/ru/`. При `SITE_BASE=/` — на `http://SERVER:8080/ru/`.

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

## GitHub Actions — проверки и ручная публикация

Папка `courses/` — отдельный Git-репозиторий с основной веткой `main`. Команды Git выполняются из этой папки. `origin` указывает на `git@github.com:LexusAlex/courses.git`. Изменения текущей задачи подготовлены локально; автоматическая публикация сайта не включена.

- `check.yml` проверяет тесты дерева категорий, функций обучения и ожидания HTTP-сервиса, типы, сборку, переводы, навигационные цепочки, ссылки и оба пути `/` и `/courses/`. Команды Makefile проверяются через `make --dry-run`, без запуска серверов или контейнеров. Дополнительно workflow создаёт временные тестовые уроки для проверки переходов, удаляет их и делает финальную чистую сборку. Отдельный job проверяет Docker-образ на GitHub runner. Проверка `/healthz` повторяет запрос при сбросе соединения во время запуска Nginx и завершается ошибкой, если сервис не готов за отведённое время. Тест `scripts/ci-readiness.test.mjs` воспроизводит такой сброс на обычном локальном HTTP-сервере и проверяет, что постоянно недоступный сервис не принимается за исправный.
- `deploy-pages.yml` публикует на GitHub Pages **только по ручному запуску** `workflow_dispatch`. Автоматической публикации при push нет.

Для публикации:

1. Загрузить изменения в репозиторий `LexusAlex/courses`, включая `pnpm-lock.yaml`.
2. В Settings → Pages репозитория `courses` выбрать Source: GitHub Actions. Домен `lexusalex.ru` должен быть настроен у основного сайта аккаунта `LexusAlex.github.io`; проект `courses` наследует его и получает путь `/courses/`. Поле Custom domain в самом проекте `courses` оставь пустым; `CNAME` с этим доменом в проект не добавляется. Это стандартная [схема домена для сайтов проектов GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages#using-a-custom-domain-across-multiple-repositories).
3. Открыть [Actions → Publish courses to GitHub Pages](https://github.com/LexusAlex/courses/actions/workflows/deploy-pages.yml), нажать **Run workflow**, выбрать ветку `main` и подтвердить запуск. Дождаться успешного завершения обоих jobs: `build` и `deploy`.

При выборе GitHub Actions в Settings → Pages не создавай дополнительный workflow из предложенных шаблонов: нужный `deploy-pages.yml` уже есть. Шаблон “Deploy static content to Pages” (`static.yml`) публикует файлы репозитория без сборки Astro. Его запуск может завершиться успешно, но `/courses/` и `/courses/ru/` будут возвращать 404: готовые HTML-страницы ещё не созданы. Если такой шаблон был добавлен, удали его и запусти `deploy-pages.yml`, который сначала собирает и проверяет сайт, затем публикует только `dist/`.

Workflow явно задаёт `SITE_URL=https://lexusalex.ru` и `SITE_BASE=/courses/`, поэтому сборка предназначена для **https://lexusalex.ru/courses/**. `actions/configure-pages` настраивает интеграцию с Pages, а адреса в сборке берутся из указанных переменных. Это не меняет DNS или настройки домена автоматически. Если основной сайт обслуживается вне GitHub Pages, маршрут `/courses/` нужно настроить на том хостинге для обслуживания этой сборки. Никакие личные токены в файлы не добавлены.

Если нужен автоматический выпуск при push в `main`, позже добавить `push: { branches: [main] }` в `on` файла `deploy-pages.yml`. Сборка на GitHub Pages и Docker на своём Linux-сервере — два независимых способа размещения.
