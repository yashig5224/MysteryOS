import json
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from app.services.ai.provider import BaseAIProvider, AIProviderRawResponse


class OpenAIProvider(BaseAIProvider):
    """
    OpenAI-compatible LLM Provider.
    Calls standard chat/completions endpoint with structured prompt and JSON mode.
    """

    def __init__(self, api_key: str, model_name: str = "gpt-4o-mini", api_base: str = "https://api.openai.com/v1"):
        self.api_key = api_key
        self._model_name = model_name
        self.api_base = api_base.rstrip("/")

    @property
    def provider_name(self) -> str:
        return "openai"

    @property
    def model_name(self) -> str:
        return self._model_name

    def _call_api(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is not set or empty. Please set OPENAI_API_KEY or switch to AI_PROVIDER=mock.")

        url = f"{self.api_base}/chat/completions"
        payload = {
            "model": self._model_name,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }
        data = json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_body = resp.read().decode("utf-8")
                return json.loads(resp_body)
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8")
            raise RuntimeError(f"OpenAI API error ({e.code}): {err_msg}")
        except Exception as e:
            raise RuntimeError(f"OpenAI request failed: {str(e)}")

    def generate_investigation_response(
        self,
        question: str,
        context: Dict[str, Any],
        system_prompt: str,
        mode: str = "overview",
    ) -> AIProviderRawResponse:
        user_prompt = (
            f"Mode: {mode}\n\n"
            f"Investigation Question: {question}\n\n"
            f"Structured Analytical Context:\n{json.dumps(context, indent=2)}\n\n"
            f"Provide your answer strictly as a JSON object matching the required schema with answer, confidence, "
            f"cited_source_ids (list of valid entity IDs from context), related_findings, related_hypotheses, and suggested_questions."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        raw_result = self._call_api(messages)
        content_str = raw_result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
        try:
            parsed = json.loads(content_str)
        except Exception:
            parsed = {"answer": content_str, "cited_source_ids": [], "confidence": "moderate"}

        return AIProviderRawResponse(
            answer=parsed.get("answer", "No answer generated."),
            confidence=parsed.get("confidence", "moderate"),
            cited_source_ids=parsed.get("cited_source_ids", []),
            related_findings=parsed.get("related_findings", []),
            related_hypotheses=parsed.get("related_hypotheses", []),
            related_threads=parsed.get("related_threads", []),
            suggested_questions=parsed.get("suggested_questions", []),
            raw_metadata=raw_result.get("usage", {}),
        )

    def generate_summary(
        self,
        context: Dict[str, Any],
        system_prompt: str,
    ) -> AIProviderRawResponse:
        user_prompt = (
            f"Generate an executive investigation summary for this dataset based strictly on the context:\n\n"
            f"{json.dumps(context, indent=2)}\n\n"
            f"Return a JSON object with answer (markdown summary), confidence, cited_source_ids, and suggested_questions."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        raw_result = self._call_api(messages)
        content_str = raw_result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
        try:
            parsed = json.loads(content_str)
        except Exception:
            parsed = {"answer": content_str, "cited_source_ids": [], "confidence": "moderate"}

        return AIProviderRawResponse(
            answer=parsed.get("answer", "Investigation summary could not be generated."),
            confidence=parsed.get("confidence", "moderate"),
            cited_source_ids=parsed.get("cited_source_ids", []),
            related_findings=parsed.get("related_findings", []),
            related_hypotheses=parsed.get("related_hypotheses", []),
            suggested_questions=parsed.get("suggested_questions", []),
            raw_metadata=raw_result.get("usage", {}),
        )
