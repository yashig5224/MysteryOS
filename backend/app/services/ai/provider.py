from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class AIProviderRawResponse(BaseModel):
    answer: str
    confidence: str = "moderate"
    cited_source_ids: List[str] = Field(default_factory=list)
    related_findings: List[str] = Field(default_factory=list)
    related_hypotheses: List[str] = Field(default_factory=list)
    related_threads: List[str] = Field(default_factory=list)
    suggested_questions: List[str] = Field(default_factory=list)
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseAIProvider(ABC):
    """
    Abstract AI Provider interface supporting OpenAI, Gemini, and Mock providers.
    All providers must return AIProviderRawResponse or raise a clear exception.
    """

    @abstractmethod
    def generate_investigation_response(
        self,
        question: str,
        context: Dict[str, Any],
        system_prompt: str,
        mode: str = "overview",
    ) -> AIProviderRawResponse:
        """Generate structured response for an investigation query."""
        pass

    @abstractmethod
    def generate_summary(
        self,
        context: Dict[str, Any],
        system_prompt: str,
    ) -> AIProviderRawResponse:
        """Generate executive investigation summary."""
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Provider identifier name."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Active model identifier."""
        pass
