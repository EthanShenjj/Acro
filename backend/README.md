# Acro Backend Service

Flask-based backend service for the Acro SaaS Demo Video Creation Tool.

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and configuration.

### 4. Set Up Database

Ensure MySQL is running and create the database:

```sql
CREATE DATABASE acro_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Initialize the database schema and seed system folders:

```bash
python init_db.py
```

This will:
- Create all database tables (projects, folders, steps)
- Create system folders: "All Flows" and "Trash"
- Verify the setup was successful

**Additional Commands:**

```bash
# Drop all tables (WARNING: deletes all data)
python init_db.py --drop

# Reset database (drop and recreate)
python init_db.py --reset
```

**Optional: Using Alembic for Migrations**

For version-controlled schema changes, you can use Alembic:

```bash
# Generate initial migration
alembic revision --autogenerate -m "Initial schema"

# Apply migrations
alembic upgrade head

# View migration status
alembic current
```

See `migrations/README.md` for detailed Alembic usage.

### 5. Run the Application

```bash
python app.py
```

The server will start on `http://localhost:5000`.

## Project Structure

```
backend/
├── app.py              # Flask application factory
├── config.py           # Configuration management
├── requirements.txt    # Python dependencies
├── models/            # Database models
├── routes/            # API endpoints
├── services/          # Business logic
├── utils/             # Utility functions
└── static/            # Static file storage
    ├── images/        # Screenshot storage
    ├── audio/         # TTS audio files
    └── thumbnails/    # Project thumbnails
```

## API Endpoints

API endpoints will be implemented in subsequent tasks.

## Testing

Run tests with pytest:

```bash
pytest
```

Run property-based tests:

```bash
pytest -v -k property
```
