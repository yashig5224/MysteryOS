from app.services.analysis.anomaly_detector import detect_numerical_anomalies


def detect_anomalies(df, dataset_id: str = "dataset"):
    """Detect anomalies in a dataframe."""
    return detect_numerical_anomalies(df, dataset_id=dataset_id)

