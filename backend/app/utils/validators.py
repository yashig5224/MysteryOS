def validate_dataset_size(size_bytes: int, max_bytes: int = 50_000_000):
    if size_bytes > max_bytes:
        raise ValueError("Dataset exceeds maximum allowed size")
    return True
