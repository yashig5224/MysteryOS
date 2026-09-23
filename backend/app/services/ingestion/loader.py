from pathlib import Path
import pandas as pd
from .csv_loader import load_csv
from .excel_loader import load_excel
from .json_loader import load_json


def load_dataset(path: str) -> pd.DataFrame:
    """Load a dataset from file path with format detection and normalization."""
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    suffix = file_path.suffix.lower()
    if suffix == ".csv":
        df = load_csv(str(file_path))
    elif suffix in {".xlsx", ".xls"}:
        df = load_excel(str(file_path))
    elif suffix == ".json":
        df = load_json(str(file_path))
    else:
        raise ValueError(f"Unsupported dataset format: '{suffix}'. Supported formats: CSV, XLSX, XLS, JSON.")

    if not isinstance(df, pd.DataFrame):
        raise ValueError(f"Extracted data from {file_path.name} is not a valid tabular DataFrame.")

    # Ensure column names are strings and not empty
    df.columns = [str(col).strip() if str(col).strip() != "" else f"col_{i}" for i, col in enumerate(df.columns)]
    return df

