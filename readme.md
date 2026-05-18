## Запуск проекта Scanfinity

### 1. Предварительные требования

- Установлен Docker и Docker Compose (либо `docker compose`, либо `docker-compose`)
- Установлен Python 3.12+ (см. `pyproject.toml`)
- Установлен `uv` (https://docs.astral.sh/uv/)
- Установлен Node.js 20+ и npm

### 2. Клонирование и базовая настройка

1. Клонируйте репозиторий и перейдите в корень проекта:
	- git clone <url_репозитория>
	- cd scanfinity
2. Создайте файл переменных окружения (если ещё не создан):
	- cp .env.example .env
3. В файле .env задайте значения переменных POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB. Эти значения должны совпадать с теми, которые будут использоваться контейнером Postgres (docker-compose читает их из .env).

#### 2.1. Email подтверждение (SMTP)

Регистрация пользователя создаёт токен подтверждения и отправляет письмо. Настройки берутся из `.env`:

- `EMAIL_VERIFY_BASE_URL` — базовый URL сайта (в проде: `https://<ваш-домен>`), чтобы ссылка в письме вела на страницу `/verify-email/?token=...`.
- `EMAIL_TOKEN_SECRET` и `JWT_SECRET_KEY` — обязательно поменяйте в продакшене (случайные длинные значения).
- SMTP (если не настроить, бэкенд будет печатать ссылку в консоль):
	- `SMTP_HOST`, `SMTP_PORT`
	- `SMTP_USER`, `SMTP_PASSWORD`
	- `SMTP_FROM` (например, `no-reply@ваш-домен`)
	- `SMTP_FROM_NAME` (опционально)
	- `SMTP_USE_TLS=true` для порта 587 (STARTTLS) или `SMTP_USE_SSL=true` для порта 465 (SMTPS)

### 3. Запуск базы данных (Docker)

1. Из корня проекта поднимите контейнер с Postgres:
	- docker-compose up -d
	  (или `docker compose up -d`, если установлен Compose v2)
2. Убедитесь, что база запустилась и доступна на localhost:${POSTGRES_PORT:-5432} (порт задаётся переменной POSTGRES_PORT в .env).

### 4. Подготовка Python-окружения и установка зависимостей backend

Зависимости описаны в `pyproject.toml` и фиксируются в `uv.lock`.

1. Из корня проекта установите зависимости (создастся `./.venv`, если её нет):
	- uv sync

При желании можно активировать окружение вручную, но это не обязательно при использовании `uv run`:
	- source .venv/bin/activate

### 5. Одноразовая инициализация пазла (puzzle.py)

Перед первым запуском приложения нужно заполнить базу данных пазлом.

1. Перейдите в каталог backend/app:
	- cd backend/app
2. Запустите скрипт генерации и вставки пазла в базу:
	- uv run python puzzle.py
3. При успешном выполнении в консоли появится информация о вставленном пазле, а в базе появится запись в таблице Puzzles.

Этот шаг нужен только при первом запуске или если вы хотите заново пересоздать пазл в базе.

### 6. Сборка frontend (Next.js)

Backend раздаёт статически собранный фронтенд из папки frontend/out, поэтому нужно заранее выполнить сборку.

1. Перейдите в каталог frontend:
	- cd ../../frontend
2. Установите зависимости:
	- npm install
3. Соберите проект:
	- npm run build

После выполнения этого шага в каталоге frontend появится папка out, которую будет использовать FastAPI.

### 7. Запуск backend (FastAPI)

1. Вернитесь в каталог backend/app (если вы не там):
	- cd ../backend/app
2. Запустите сервер FastAPI через uvicorn (через `uv run`):
	- uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

Приложение будет доступно по адресу http://localhost:8000.

### 8. Краткое резюме порядка запуска

1. Настроить .env (POSTGRES_*).
2. Поднять Docker-контейнер с Postgres: docker compose up -d.
3. Установить Python-зависимости: uv sync.
4. Один раз запустить backend/app/puzzle.py для заполнения базы: uv run python puzzle.py.
5. Собрать frontend (frontend: npm install, npm run build).
6. Запустить backend через uvicorn: uv run uvicorn main:app ...

После этого можно открывать http://localhost:8000 в браузере и пользоваться приложением.
