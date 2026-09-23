import json
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any
import pandas as pd

from app.models.dataset import DatasetModel
from app.services.ingestion.loader import load_dataset
from app.api.schemas.dataset import DatasetMetadata, DatasetProfile, DatasetPreview


class DatasetStore:
    """Manages dataset storage, loading, metadata persistence, and previews."""

    def __init__(self, base_dir: Optional[str] = None):
        if base_dir:
            self.base_dir = Path(base_dir)
        else:
            # Point to mysteryos-complete/data relative to backend
            self.base_dir = Path(__file__).resolve().parent.parent.parent.parent.parent / "data"

        self.uploads_dir = self.base_dir / "uploads"
        self.processed_dir = self.base_dir / "processed"

        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.processed_dir.mkdir(parents=True, exist_ok=True)

        self.index_file = self.processed_dir / "datasets_index.json"
        self._datasets: Dict[str, Dict[str, Any]] = {}
        self._load_index()

    def _load_index(self):
        """Load metadata index from disk if available."""
        if self.index_file.exists():
            try:
                with open(self.index_file, "r", encoding="utf-8") as f:
                    self._datasets = json.load(f)
            except Exception:
                self._datasets = {}

    def _save_index(self):
        """Save metadata index to disk."""
        try:
            with open(self.index_file, "w", encoding="utf-8") as f:
                json.dump(self._datasets, f, indent=2)
        except Exception:
            pass

    def save_uploaded_file(self, filename: str, content: bytes) -> tuple[str, Path]:
        """Save raw bytes to uploads directory with unique dataset ID."""
        dataset_id = str(uuid.uuid4())
        suffix = Path(filename).suffix.lower()
        safe_filename = f"{dataset_id}_{Path(filename).stem}{suffix}"
        target_path = self.uploads_dir / safe_filename

        with open(target_path, "wb") as f:
            f.write(content)

        return dataset_id, target_path

    def register_dataset(
        self,
        dataset_id: str,
        name: str,
        filename: str,
        file_type: str,
        size_bytes: int,
        file_path: str,
        row_count: int,
        column_count: int,
        health_score: int,
        profile_data: Optional[Dict[str, Any]] = None,
    ) -> DatasetMetadata:
        """Register a dataset and its profile in store."""
        now = datetime.now(timezone.utc).isoformat()
        dataset_dict = {
            "id": dataset_id,
            "name": name,
            "filename": filename,
            "file_type": file_type,
            "size_bytes": size_bytes,
            "file_path": str(file_path),
            "row_count": row_count,
            "column_count": column_count,
            "health_score": health_score,
            "created_at": now,
            "updated_at": now,
            "profile": profile_data,
        }
        self._datasets[dataset_id] = dataset_dict
        self._save_index()

        return DatasetMetadata(**{k: v for k, v in dataset_dict.items() if k != "profile" and k != "file_path"})

    def list_datasets(self) -> List[DatasetMetadata]:
        """List all datasets sorted by creation time descending."""
        results = []
        for ds in self._datasets.values():
            meta_dict = {k: v for k, v in ds.items() if k != "profile" and k != "file_path"}
            results.append(DatasetMetadata(**meta_dict))
        return sorted(results, key=lambda x: x.created_at, reverse=True)

    def dataset_exists(self, dataset_id: str) -> bool:
        """Check if dataset exists in store."""
        return dataset_id in self._datasets

    def get_dataset_metadata(self, dataset_id: str) -> Optional[DatasetMetadata]:
        """Get dataset metadata by ID."""
        ds = self._datasets.get(dataset_id)
        if not ds:
            return None
        meta_dict = {k: v for k, v in ds.items() if k != "profile" and k != "file_path"}
        return DatasetMetadata(**meta_dict)

    def get_dataset_profile(self, dataset_id: str) -> Optional[DatasetProfile]:
        """Get full profile by ID."""
        ds = self._datasets.get(dataset_id)
        if not ds or "profile" not in ds or not ds["profile"]:
            return None
        return DatasetProfile(**ds["profile"])

    def get_dataset_df(self, dataset_id: str) -> Optional[pd.DataFrame]:
        """Load pandas DataFrame for a dataset."""
        ds = self._datasets.get(dataset_id)
        if not ds:
            return None
        path = ds.get("file_path")
        if not path or not Path(path).exists():
            return None
        return load_dataset(path)

    def get_dataset_preview(self, dataset_id: str, limit: int = 50, offset: int = 0) -> Optional[DatasetPreview]:
        """Return paginated preview rows and columns."""
        df = self.get_dataset_df(dataset_id)
        if df is None:
            return None

        total_rows = len(df)
        paginated_df = df.iloc[offset : offset + limit]

        # Convert NaN, inf, NaT to None for valid JSON serialization
        records = paginated_df.replace({float("nan"): None, float("inf"): None, float("-inf"): None}).to_dict(
            orient="records"
        )

        # Convert timestamps / dates to strings in records
        cleaned_records = []
        for row in records:
            cleaned_row = {}
            for k, v in row.items():
                if isinstance(v, (pd.Timestamp, datetime)):
                    cleaned_row[k] = v.isoformat()
                else:
                    cleaned_row[k] = v
            cleaned_records.append(cleaned_row)

        return DatasetPreview(
            dataset_id=dataset_id,
            columns=list(df.columns),
            rows=cleaned_records,
            total_rows=total_rows,
            limit=limit,
            offset=offset,
        )

    def delete_dataset(self, dataset_id: str) -> bool:
        """Delete dataset file and metadata."""
        ds = self._datasets.pop(dataset_id, None)
        if not ds:
            return False

        path = ds.get("file_path")
        if path and Path(path).exists():
            try:
                os.remove(path)
            except Exception:
                pass

        self._save_index()
        return True


# Global singleton instance
dataset_store = DatasetStore()
