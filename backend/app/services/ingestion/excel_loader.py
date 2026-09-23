import pandas as pd
from pathlib import Path


def load_excel(path: str) -> pd.DataFrame:
    """Load an Excel workbook (XLSX/XLS) into a pandas DataFrame."""
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"Excel file not found: {path}")

    suffix = file_path.suffix.lower()
    if suffix == ".xlsx":
        return pd.read_excel(file_path, engine="openpyxl")
    elif suffix == ".xls":
        try:
            return pd.read_excel(file_path)
        except Exception:
            return pd.read_excel(file_path, engine="openpyxl")
    else:
        return pd.read_excel(file_path)

