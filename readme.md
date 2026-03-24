## Backend setup & run

### 1. Клонирование репозитория

```bash
git clone <url-репозитория>
cd scanfinity
```

### 2. Настройка переменных окружения

Создай в корне проекта файл `.env` со значениями для PostgreSQL (используются в docker-compose):

```env
POSTGRES_USER=Какой-то_юзер
POSTGRES_PASSWORD=Какой-то_пароль
POSTGRES_PORT=5432
```

### 3. Запуск PostgreSQL через Docker

Из корня проекта:

```bash
docker-compose up -d
```

Это поднимет контейнер `postgresdb` и применит скрипт `postgres/scanfinity_db.sql` (создаст таблицы).

### 4. Установка зависимостей бекенда

Создай и активируй виртуальное окружение (Python 3.12+), затем установи зависимости:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 5. Запуск бекенда

Находясь в каталоге `backend` с активированным venv, запусти FastAPI-приложение через uvicorn:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

После старта документация будет доступна по адресу:

- Swagger UI: http://localhost:8000/docs

### 6. Регистрация пользователя (проверка)

Отправь POST-запрос на эндпоинт регистрации:

- `POST http://localhost:8000/api/users`

Пример тела запроса (JSON):

```json
{
	"username": "testuser",
	"email": "user@example.com",
	"password": "password123"
}
```

В случае успеха вернётся созданный пользователь с кодом `201 Created`.
