"""Data loader module for CSV files with caching support"""
import os
from pathlib import Path
import pandas as pd


# Module-level cache for DataFrames with explicit dict
_cache: dict = {}

# Data directory from environment variable
DATA_DIR = os.getenv("DATA_DIR", "backend/data")


def _load_csv(filepath: str) -> pd.DataFrame:
    """
    Load a CSV file into the module cache.
    
    Args:
        filepath: Path to the CSV file
        
    Returns:
        Loaded DataFrame
        
    Raises:
        FileNotFoundError: If the CSV file does not exist
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(
            f"CSV file not found: {filepath}\n"
            f"Please ensure the file exists at the specified location."
        )
    
    try:
        df = pd.read_csv(filepath)
        return df
    except pd.errors.ParserError as e:
        raise ValueError(f"Failed to parse CSV file {filepath}: {e}")
    except Exception as e:
        raise RuntimeError(f"Error loading CSV file {filepath}: {e}")


def load_transactions(filepath: str = None) -> pd.DataFrame:
    """
    Load transactions CSV file with caching.

    Behavior: when no filepath is provided, prefer a 'master.csv' file if present
    in known locations (backend/data/master.csv, Mule-data/master.csv). Falls
    back to backend/data/transactions.csv otherwise.

    Args:
        filepath: Path to transactions CSV file (defaults to DATA_DIR/transactions.csv)

    Returns:
        DataFrame containing transactions data

    Raises:
        FileNotFoundError: If the CSV file does not exist
        ValueError: If CSV parsing fails
        RuntimeError: If loading fails
    """
    if filepath is None:
        # Prefer explicit master.csv if available (project-root or backend)
        candidates = [
            os.path.join("backend", "data", "master.csv"),
            os.path.join("Mule-data", "master.csv"),
            os.path.join("..", "Mule-data", "master.csv"),
            os.path.join("backend", "data", "transactions.csv"),
            os.path.join("transactions.csv"),
        ]
        found = None
        for cand in candidates:
            if os.path.exists(cand):
                found = cand
                break
        if found:
            filepath = found
        else:
            # Fallback to DATA_DIR default
            filepath = os.path.join(DATA_DIR, "transactions.csv")

    # If relative path, try from current directory first, then from parent
    if not os.path.isabs(filepath):
        # Try as-is first
        if not os.path.exists(filepath):
            # Try one level up (if we're in backend directory)
            alt_path = os.path.join("..", filepath)
            if os.path.exists(alt_path):
                filepath = alt_path
            else:
                # Try without backend prefix if running from project root
                alt_path2 = filepath.replace("backend/", "")
                if os.path.exists(alt_path2):
                    filepath = alt_path2

    filepath = os.path.abspath(filepath)
    return _load_csv(filepath)


def load_account_features(filepath: str = None) -> pd.DataFrame:
    """
    Load account features CSV file with caching.
    
    Args:
        filepath: Path to account features CSV file (defaults to DATA_DIR/account_features.csv)
        
    Returns:
        DataFrame containing account features data
        
    Raises:
        FileNotFoundError: If the CSV file does not exist
        ValueError: If CSV parsing fails
        RuntimeError: If loading fails
    """
    if filepath is None:
        filepath = os.path.join(DATA_DIR, "account_features.csv")
    
    # If relative path, try from current directory first, then from parent
    if not os.path.isabs(filepath):
        # Try as-is first
        if not os.path.exists(filepath):
            # Try one level up (if we're in backend directory)
            alt_path = os.path.join("..", filepath)
            if os.path.exists(alt_path):
                filepath = alt_path
            else:
                # Try without backend prefix if running from project root
                alt_path2 = filepath.replace("backend/", "")
                if os.path.exists(alt_path2):
                    filepath = alt_path2
    
    filepath = os.path.abspath(filepath)
    return _load_csv(filepath)


def get_transactions() -> pd.DataFrame:
    """
    Public API to get transactions DataFrame with caching.
    
    Returns:
        Cached transactions DataFrame
        
    Raises:
        FileNotFoundError: If transactions.csv not found
    """
    if "transactions" not in _cache:
        _cache["transactions"] = load_transactions()
    return _cache["transactions"]


def get_account_features() -> pd.DataFrame:
    """
    Public API to get account features DataFrame with caching.
    
    Returns:
        Cached account features DataFrame
        
    Raises:
        FileNotFoundError: If account_features.csv not found
    """
    if "account_features" not in _cache:
        _cache["account_features"] = load_account_features()
    return _cache["account_features"]


def invalidate_cache() -> None:
    """
    Clear the explicit cache dict to force reload of all CSVs on next access.
    
    Useful for hot-reloading CSV files without restarting the server.
    """
    _cache.clear()


def get_cache_info() -> dict:
    """
    Get cache statistics.
    
    Returns:
        Dictionary with cache contents info
    """
    return {
        "cached_files": list(_cache.keys()),
        "cache_size": len(_cache),
    }
