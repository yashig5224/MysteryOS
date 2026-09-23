import json
import pandas as pd
from pathlib import Path


def load_json(path: str) -> pd.DataFrame:
    """Load a JSON file supporting array of records, nested dicts, or lines."""
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"JSON file not found: {path}")

    # Try standard json read first
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, list):
            return pd.json_normalize(data)
        elif isinstance(data, dict):
            # Check for common record keys
            for key in ["data", "records", "items", "rows", "results"]:
                if key in data and isinstance(data[key], list):
                    return pd.json_normalize(data[key])
            # Flatten dictionary
            return pd.json_normalize([data])
    except json.JSONDecodeError:
        # Try JSON Lines
        try:
            return pd.read_json(file_path, lines=True)
        except Exception:
            pass
    except Exception:
        pass

    # Final fallback to standard pandas read_json
    return pd.read_json(file_path)

