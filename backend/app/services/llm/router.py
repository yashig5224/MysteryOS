class LLMRouter:
    def __init__(self, provider):
        self.provider = provider

    def generate(self, prompt: str) -> str:
        raise NotImplementedError
