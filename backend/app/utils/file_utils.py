from pathlib import Path

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".json", ".pdf"}

def is_supported_file(path: str) -> bool:
    return Path(path).suffix.lower() in ALLOWED_EXTENSIONS
