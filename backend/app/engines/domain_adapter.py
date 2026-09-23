class DomainAdapter:
    """Extension point for domain-specific interpretation without changing core analysis."""

    def detect_relevant_fields(self, dataset):
        return {}

    def interpret(self, analysis):
        return analysis
