import pandas as pd
from pathlib import Path


def load_csv(path: str) -> pd.DataFrame:
    """Load a CSV file with automatic encoding and delimiter fallback."""
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"CSV file not found: {path}")

    encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252", "iso-8859-1"]
    last_error = None

    for encoding in encodings:
        try:
            # Try reading with automatic delimiter detection
            df = pd.read_csv(file_path, encoding=encoding, sep=None, engine="python")
            return df
        except Exception as e:
            last_error = e
            try:
                # Fallback to standard comma separator
                df = pd.read_csv(file_path, encoding=encoding)
                return df
            except Exception as inner_e:
                last_error = inner_e
                continue

    raise ValueError(f"Failed to parse CSV file: {last_error}")

