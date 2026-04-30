#!/usr/bin/env python3
"""
Database initialization script.
Creates all tables and populates initial data.

Usage:
    python init/init_db.py
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from backend.db.db_config import DBConfig, create_db_engine


def execute_sql_file(engine, file_path: str, description: str):
    """Execute SQL statements from a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        statements = [s.strip() for s in sql_content.split(';') if s.strip()]
        
        print(f"\n{'='*60}")
        print(f"Executing: {description}")
        print(f"{'='*60}")
        
        with engine.begin() as conn:
            for i, statement in enumerate(statements, 1):
                if statement.startswith('--') or not statement.strip():
                    continue
                try:
                    conn.execute(text(statement))
                    print(f"✓ Statement {i} executed")
                except Exception as e:
                    print(f"✗ Statement {i} failed: {e}")
                    raise
        
        print(f"✓ {description} completed!")
        return True
        
    except FileNotFoundError:
        print(f"✗ File not found: {file_path}")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def main():
    """Main initialization routine."""
    
    print("\n" + "="*60)
    print("VET APP DATABASE INITIALIZATION")
    print("="*60)
    
    print("\n1. Loading database configuration...")
    try:
        cfg = DBConfig.from_env()
        print(f"   Host: {cfg.host}")
        print(f"   Port: {cfg.port}")
        print(f"   Database: {cfg.database}")
    except Exception as e:
        print(f"✗ Failed: {e}")
        return False
    
    print("\n2. Creating database engine...")
    try:
        engine = create_db_engine(cfg)
        print("✓ Engine created")
    except Exception as e:
        print(f"✗ Failed: {e}")
        return False
    
    print("\n3. Testing connection...")
    try:
        with engine.begin() as conn:
            conn.execute(text("SELECT 1"))
        print("✓ Connection successful")
    except Exception as e:
        print(f"✗ Failed: {e}")
        return False
    
    script_dir = Path(__file__).parent
    
    print("\n4. Creating schema...")
    if not execute_sql_file(engine, str(script_dir / "schema.sql"), "Schema"):
        return False
    
    print("\n5. Seeding data...")
    if not execute_sql_file(engine, str(script_dir / "seed_data.sql"), "Seed Data"):
        return False
    
    print("\n" + "="*60)
    print("✓ DATABASE INITIALIZATION COMPLETED!")
    print("="*60 + "\n")
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
