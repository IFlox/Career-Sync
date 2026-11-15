"""
Focused tests for database selection, PostgreSQL failure reporting, and
credential-safe diagnostics.

No live PostgreSQL server is required. The unreachable-PostgreSQL tests point
at a closed localhost port, so they fail fast with "connection refused".
"""

import os
import tempfile
import unittest
from unittest.mock import patch

from sqlalchemy import inspect

import database


UNREACHABLE_POSTGRES_URL = (
    "postgresql://careersync_user:sup3r-secret-pw@127.0.0.1:1/careersync"
)
QUERY_SECRET_POSTGRES_URL = (
    "postgresql://careersync_user:sup3r-secret-pw@127.0.0.1:1/careersync"
    "?sslpassword=query-secret-value"
)


class DatabaseSelectionTests(unittest.TestCase):
    def test_no_database_url_selects_postgresql(self):
        with patch.dict(os.environ, {"DATABASE_URL": ""}, clear=False):
            config = database.resolve_database_config()

        self.assertEqual(config.backend, "postgresql")
        self.assertTrue(config.postgres_configured)
        self.assertFalse(config.sqlite_fallback_active)
        self.assertFalse(config.sqlite_default_active)
        self.assertEqual(config.url, database.DEFAULT_POSTGRES_URL)
        self.assertEqual(config.host, "localhost")
        self.assertEqual(config.port, 5432)
        self.assertEqual(config.database, "careersync")

        db_engine = database.create_database_engine(config)
        try:
            self.assertEqual(db_engine.dialect.name, "postgresql")
            self.assertEqual(db_engine.url.drivername, "postgresql+psycopg2")
        finally:
            db_engine.dispose()

    def test_missing_database_url_selects_postgresql(self):
        with patch.dict(os.environ, {}, clear=True):
            config = database.resolve_database_config()

        self.assertEqual(config.backend, "postgresql")
        self.assertTrue(config.postgres_configured)
        self.assertFalse(config.sqlite_fallback_active)
        self.assertFalse(config.sqlite_default_active)
        self.assertEqual(config.url, database.DEFAULT_POSTGRES_URL)

    def test_whitespace_database_url_selects_postgresql(self):
        with patch.dict(os.environ, {"DATABASE_URL": "   "}, clear=False):
            config = database.resolve_database_config()

        self.assertEqual(config.backend, "postgresql")
        self.assertTrue(config.postgres_configured)
        self.assertFalse(config.sqlite_fallback_active)
        self.assertFalse(config.sqlite_default_active)

    def test_explicit_postgresql_url_is_selected(self):
        config = database.resolve_database_config(
            "postgresql://careersync_user:pw@db.example.org:5433/careersync"
        )

        self.assertEqual(config.backend, "postgresql")
        self.assertTrue(config.postgres_configured)
        self.assertFalse(config.sqlite_fallback_active)
        self.assertFalse(config.sqlite_default_active)
        self.assertEqual(config.host, "db.example.org")
        self.assertEqual(config.port, 5433)
        self.assertEqual(config.database, "careersync")
        self.assertTrue(config.url.startswith("postgresql+psycopg2://"))

        db_engine = database.create_database_engine(config)
        try:
            self.assertEqual(db_engine.dialect.name, "postgresql")
            self.assertEqual(db_engine.url.drivername, "postgresql+psycopg2")
        finally:
            db_engine.dispose()

    def test_postgres_alias_is_normalized_for_psycopg2(self):
        config = database.resolve_database_config(
            "postgres://careersync_user:pw@localhost:5432/careersync"
        )

        self.assertEqual(config.backend, "postgresql")
        self.assertFalse(config.sqlite_default_active)
        self.assertTrue(config.url.startswith("postgresql+psycopg2://"))

    def test_explicit_sqlite_url_is_selected_without_fallback(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = os.path.join(temp_dir, "custom.db")
            config = database.resolve_database_config(f"sqlite:///{path}")

        self.assertEqual(config.backend, "sqlite")
        self.assertFalse(config.postgres_configured)
        self.assertFalse(config.sqlite_fallback_active)
        self.assertFalse(config.sqlite_default_active)
        self.assertEqual(config.sqlite_path, path)

    def test_non_sqlite_opt_in_url_is_rejected(self):
        with self.assertRaises(database.DatabaseConfigurationError):
            database.resolve_database_config("sqlite+pysqlite:///./careersync.db")


class ExplicitPostgresFailureTests(unittest.TestCase):
    def test_unreachable_explicit_postgresql_url_raises_actionable_error(self):
        config = database.resolve_database_config(UNREACHABLE_POSTGRES_URL)

        with self.assertRaises(database.DatabaseConnectionError) as context:
            database.connect_database(config)

        message = str(context.exception)
        self.assertIn("PostgreSQL is configured as the database backend", message)
        self.assertIn("PostgreSQL must be running", message)
        self.assertIn("127.0.0.1:1", message)
        self.assertIn("Get-Service -Name 'postgresql*'", message)
        self.assertIn("Test-NetConnection -ComputerName 127.0.0.1 -Port 1", message)
        self.assertIn("pg_isready -h 127.0.0.1 -p 1 -U postgres", message)
        self.assertIn("will not silently fall back to SQLite", message)

    def test_unreachable_postgres_error_does_not_leak_password(self):
        config = database.resolve_database_config(UNREACHABLE_POSTGRES_URL)

        with self.assertRaises(database.DatabaseConnectionError) as context:
            database.connect_database(config)

        self.assertNotIn("sup3r-secret-pw", str(context.exception))

    def test_sqlite_fallback_does_not_hide_explicit_postgres_failure(self):
        created_urls = []
        real_create_engine = database.create_engine

        def recording_create_engine(url, **kwargs):
            created_urls.append(str(url))
            return real_create_engine(url, **kwargs)

        config = database.resolve_database_config(UNREACHABLE_POSTGRES_URL)
        self.assertFalse(config.sqlite_fallback_active)

        with patch.object(database, "create_engine", side_effect=recording_create_engine):
            with self.assertRaises(database.DatabaseConnectionError):
                database.connect_database(config)

        self.assertEqual(len(created_urls), 1)
        self.assertTrue(created_urls[0].startswith("postgresql+psycopg2://"))
        self.assertFalse(any(url.startswith("sqlite") for url in created_urls))


class DatabaseDiagnosticsTests(unittest.TestCase):
    def test_postgres_diagnostics_exclude_credentials_and_query_secrets(self):
        config = database.resolve_database_config(QUERY_SECRET_POSTGRES_URL)

        status = database.database_status(config, connection_verified=False)
        message = database.format_database_status(config, connection_verified=False)
        rendered = f"{status} {message}"

        self.assertEqual(status["database_backend"], "postgresql")
        self.assertEqual(status["backend"], "postgresql")
        self.assertTrue(status["postgres_configured"])
        self.assertFalse(status["sqlite_fallback_active"])
        self.assertFalse(status["sqlite_default_active"])
        self.assertIn("127.0.0.1:1", status["target"])

        self.assertNotIn("sup3r-secret-pw", rendered)
        self.assertNotIn("query-secret-value", rendered)
        self.assertNotIn("careersync_user:sup3r-secret-pw", rendered)

    def test_no_database_url_diagnostics_report_postgresql(self):
        with patch.dict(os.environ, {"DATABASE_URL": ""}, clear=False):
            config = database.resolve_database_config()

        status = database.database_status(config, connection_verified=True)
        message = database.format_database_status(config, connection_verified=True)
        rendered = f"{status} {message}"

        self.assertEqual(status["database_backend"], "postgresql")
        self.assertEqual(status["backend"], "postgresql")
        self.assertTrue(status["postgres_configured"])
        self.assertFalse(status["sqlite_fallback_active"])
        self.assertFalse(status["sqlite_default_active"])
        self.assertTrue(status["connection_verified"])
        self.assertIn("localhost:5432", status["target"])
        self.assertIn("backend=postgresql", message)
        self.assertIn("postgres_configured=true", message)
        self.assertIn("sqlite_fallback_active=false", message)
        self.assertIn("sqlite_default_active=false", message)

        # The default password is never rendered in diagnostics.
        self.assertNotIn("postgres:postgres", rendered)
        self.assertNotIn(":postgres@", rendered)

    def test_explicit_sqlite_diagnostics_are_neither_default_nor_fallback(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = os.path.join(temp_dir, "custom.db")
            config = database.resolve_database_config(f"sqlite:///{path}")

            status = database.database_status(config, connection_verified=True)
            message = database.format_database_status(config, connection_verified=True)

        self.assertEqual(status["database_backend"], "sqlite")
        self.assertFalse(status["postgres_configured"])
        self.assertFalse(status["sqlite_fallback_active"])
        self.assertFalse(status["sqlite_default_active"])
        self.assertIn("sqlite_fallback_active=false", message)
        self.assertIn("sqlite_default_active=false", message)


class SqliteBootstrapTests(unittest.TestCase):
    def test_sqlite_database_file_is_created_with_expected_tables(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = os.path.join(temp_dir, "nested", "careersync.db")
            config = database.resolve_database_config(f"sqlite:///{path}")
            db_engine = database.create_database_engine(config)

            try:
                database.init_db(db_engine, config)

                self.assertTrue(os.path.exists(path))
                table_names = set(inspect(db_engine).get_table_names())
                self.assertIn("students", table_names)
                self.assertIn("student_preferences", table_names)
                self.assertIn("recommendation_feedback", table_names)
                self.assertIn("applications", table_names)
                self.assertIn("progress_events", table_names)
            finally:
                db_engine.dispose()


if __name__ == "__main__":
    unittest.main()
