import io
import json
import pandas as pd
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_upload_csv_dataset():
    csv_content = (
        "transaction_id,timestamp,customer_id,amount,category\n"
        "TX1001,2026-01-01 10:00:00,CUST_A,150.50,Retail\n"
        "TX1002,2026-01-02 11:30:00,CUST_B,250.00,Grocery\n"
        "TX1003,2026-01-03 14:15:00,CUST_A,99.99,Retail\n"
        "TX1004,2026-01-04 09:00:00,CUST_C,,Electronics\n"
    )
    files = {"file": ("transactions.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/datasets/upload", files=files)
    assert response.status_code == 201
    data = response.json()
    assert "metadata" in data
    assert "profile" in data
    dataset_id = data["metadata"]["id"]
    assert data["metadata"]["row_count"] == 4
    assert data["metadata"]["column_count"] == 5
    assert data["metadata"]["file_type"] == "CSV"
    assert data["profile"]["quality"]["overall_score"] > 0

    # Test list datasets
    list_res = client.get("/api/datasets")
    assert list_res.status_code == 200
    ids = [d["id"] for d in list_res.json()]
    assert dataset_id in ids

    # Test get dataset metadata
    meta_res = client.get(f"/api/datasets/{dataset_id}")
    assert meta_res.status_code == 200
    assert meta_res.json()["id"] == dataset_id

    # Test get profile
    prof_res = client.get(f"/api/datasets/{dataset_id}/profile")
    assert prof_res.status_code == 200
    profile_data = prof_res.json()
    assert profile_data["row_count"] == 4
    assert len(profile_data["columns"]) == 5

    # Test preview
    preview_res = client.get(f"/api/datasets/{dataset_id}/preview?limit=2&offset=0")
    assert preview_res.status_code == 200
    preview_data = preview_res.json()
    assert len(preview_data["rows"]) == 2
    assert preview_data["total_rows"] == 4
    assert "transaction_id" in preview_data["columns"]

    # Test delete
    del_res = client.delete(f"/api/datasets/{dataset_id}")
    assert del_res.status_code == 200


def test_upload_json_dataset():
    records = [
        {"user_id": "U1", "name": "Alice", "score": 95.0, "active": True},
        {"user_id": "U2", "name": "Bob", "score": 88.5, "active": False},
        {"user_id": "U3", "name": "Charlie", "score": None, "active": True},
    ]
    json_bytes = json.dumps(records).encode("utf-8")
    files = {"file": ("users.json", io.BytesIO(json_bytes), "application/json")}
    response = client.post("/api/datasets/upload", files=files)
    assert response.status_code == 201
    data = response.json()
    assert data["metadata"]["row_count"] == 3
    assert data["metadata"]["column_count"] == 4

    dataset_id = data["metadata"]["id"]
    client.delete(f"/api/datasets/{dataset_id}")


def test_upload_xlsx_dataset():
    df = pd.DataFrame({
        "order_id": [1, 2, 3],
        "product": ["Widget A", "Widget B", "Widget C"],
        "price": [19.99, 29.99, 39.99],
    })
    excel_buffer = io.BytesIO()
    with pd.ExcelWriter(excel_buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    excel_buffer.seek(0)

    files = {"file": ("orders.xlsx", excel_buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    response = client.post("/api/datasets/upload", files=files)
    assert response.status_code == 201
    data = response.json()
    assert data["metadata"]["row_count"] == 3
    assert data["metadata"]["file_type"] == "XLSX"

    dataset_id = data["metadata"]["id"]
    client.delete(f"/api/datasets/{dataset_id}")


def test_reject_unsupported_file_type():
    files = {"file": ("malicious.exe", io.BytesIO(b"executable content"), "application/octet-stream")}
    response = client.post("/api/datasets/upload", files=files)
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_nonexistent_dataset_404():
    res = client.get("/api/datasets/nonexistent-id-999")
    assert res.status_code == 404

