def build_timeline(events):
    return sorted(events, key=lambda event: event.get("timestamp", ""))
