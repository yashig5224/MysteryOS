def normalize_column_names(columns):
    return [str(column).strip().lower().replace(" ", "_") for column in columns]
