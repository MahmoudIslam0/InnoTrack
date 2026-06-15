import pandas as pd
import json

_engine = None

def get_engine():
    global _engine
    if _engine is None:
        from sqlalchemy import create_engine
        import urllib
        
        SERVER = "innotrack-sql-server.database.windows.net"
        DATABASE = "InnoTrackDB"
        USERNAME = "innotrackadmin"
        PASSWORD = "Innotrack@admin233"

        params = urllib.parse.quote_plus(
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={SERVER};"
            f"DATABASE={DATABASE};"
            f"UID={USERNAME};"
            f"PWD={PASSWORD};"
            "Encrypt=yes;"
            "TrustServerCertificate=no;"
            "Connection Timeout=30;"
        )

        connection_string = (
            f"mssql+pyodbc:///?odbc_connect={params}"
        )
        _engine = create_engine(connection_string, pool_pre_ping=True)
        
        # Test connection once lazily
        try:
            with _engine.connect() as conn:
                print("SQL Connected Successfully")
        except Exception as e:
            print("Connection Failed")
            print(e)
            
    return _engine

class LazyEngine:
    def __getattr__(self, name):
        return getattr(get_engine(), name)
    def __repr__(self):
        return repr(get_engine())

engine = LazyEngine()


def load_preprocessed_projects():
    try:
        query = """
        SELECT *
        FROM preprocess
        """

        with engine.connect() as conn:
            df = pd.read_sql(
                query,
                conn
            )

        if "features" in df.columns:

            def parse_features(x):

                if not isinstance(x, str):
                    return x

                try:
                    x = json.loads(x)

                    if isinstance(x, str):
                        x = json.loads(x)

                    return x

                except Exception:
                    return []

            df["features"] = df["features"].apply(parse_features)

        return df

    except Exception as e:
        print(f"Database connection failed, falling back to local metadata file. Error: {e}")
        import os
        from pathlib import Path
        possible_paths = [
            Path(__file__).resolve().parents[2] / "models" / "metadata.parquet",
            Path("models/metadata.parquet"),
            Path("../models/metadata.parquet"),
        ]
        for path in possible_paths:
            if path.exists():
                print(f"Loading local metadata from {path}")
                df = pd.read_parquet(path)
                if "features" in df.columns:
                    df["features"] = df["features"].apply(
                        lambda x: x.tolist() if hasattr(x, "tolist") else (list(x) if isinstance(x, (list, tuple, set)) else [])
                    )
                return df
        raise FileNotFoundError(f"Could not connect to database and local metadata.parquet was not found. Looked in: {[str(p) for p in possible_paths]}")