# Database Migrations

This directory contains Alembic database migrations for the Acro backend.

## Overview

Alembic is an optional database migration tool that provides version control for database schema changes. While the `init_db.py` script can create the initial schema, Alembic is useful for:

- Tracking schema changes over time
- Rolling back changes if needed
- Managing schema updates in production
- Collaborating on schema changes with a team

## Setup

1. Install dependencies (including Alembic):
   ```bash
   pip install -r requirements.txt
   ```

2. Initialize the database (creates tables and system folders):
   ```bash
   python init_db.py
   ```

## Usage

### Creating a New Migration

After modifying SQLAlchemy models, generate a migration:

```bash
alembic revision --autogenerate -m "Description of changes"
```

This will create a new migration file in `migrations/versions/`.

### Applying Migrations

Apply all pending migrations:

```bash
alembic upgrade head
```

### Rolling Back Migrations

Rollback the last migration:

```bash
alembic downgrade -1
```

Rollback to a specific revision:

```bash
alembic downgrade <revision_id>
```

### Viewing Migration History

Show current migration status:

```bash
alembic current
```

Show migration history:

```bash
alembic history
```

## Initial Migration

To create an initial migration from the current models:

```bash
# Generate initial migration
alembic revision --autogenerate -m "Initial schema"

# Apply the migration
alembic upgrade head
```

## Notes

- Alembic reads database configuration from `config.py` via `migrations/env.py`
- Migration files are stored in `migrations/versions/`
- Always review auto-generated migrations before applying them
- Test migrations in development before applying to production
- The `init_db.py` script is still the recommended way for initial setup

## Troubleshooting

**Issue**: Alembic can't find models
- **Solution**: Ensure all models are imported in `migrations/env.py`

**Issue**: Database URL not found
- **Solution**: Check that `.env` file exists with correct database credentials

**Issue**: Migration conflicts
- **Solution**: Use `alembic merge` to resolve conflicting migration branches
