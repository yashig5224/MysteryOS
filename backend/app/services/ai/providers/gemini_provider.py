import json
import re
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from app.services.ai.provider import BaseAIProvider, AIProviderRawResponse


class GeminiProvider(BaseAIProvider):
    """
    Google Gemini LLM Provider.
    Calls standard Gemini generateContent REST endpoint with structured system instructions.
    """

    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash"):
        self.api_key = api_key
        self._model_name = model_name

    @property
    def provider_name(self) -> str:
        return "gemini"

    @property
    def model_name(self) -> str:
        return self._model_name

    def _call_api(self, system_instruction: str, prompt: str) -> Dict[str, Any]:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set or empty. Please set GEMINI_API_KEY or switch to AI_PROVIDER=mock.")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self._model_name}:generateContent?key={self.api_key}"
        payload = {
            "systemInstruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json"
            }
        }
        data = json.dumps(payload).encode("utf-8")
        headers = {"Content-Type": "application/json"}

        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_body = resp.read().decode("utf-8")
                return json.loads(resp_body)
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8")
            raise RuntimeError(f"Gemini API error ({e.code}): {err_msg}")
        except Exception as e:
            raise RuntimeError(f"Gemini request failed: {str(e)}")

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
            f"Provide your answer strictly as a JSON object matching the required schema with: "
            f"answer (string), confidence (low|moderate|high), cited_source_ids (list of valid entity IDs from context), "
            f"related_findings (list of finding IDs), related_hypotheses (list of hypothesis IDs), and suggested_questions (list of strings)."
        )

        raw_result = self._call_api(system_prompt, user_prompt)
        text_content = ""
        candidates = raw_result.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                text_content = parts[0].get("text", "")

        try:
            parsed = json.loads(text_content)
        except Exception:
            # Fallback if markdown json block returned
            match = re.search(r"```json\s*(.*?)\s*```", text_content, re.DOTALL)
            if match:
                parsed = json.loads(match.group(1))
            else:
                parsed = {"answer": text_content, "cited_source_ids": [], "confidence": "moderate"}

        return AIProviderRawResponse(
            answer=parsed.get("answer", "No answer generated."),
            confidence=parsed.get("confidence", "moderate"),
            cited_source_ids=parsed.get("cited_source_ids", []),
            related_findings=parsed.get("related_findings", []),
            related_hypotheses=parsed.get("related_hypotheses", []),
            related_threads=parsed.get("related_threads", []),
            suggested_questions=parsed.get("suggested_questions", []),
            raw_metadata=raw_result.get("usageMetadata", {}),
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

        raw_result = self._call_api(system_prompt, user_prompt)
        text_content = ""
        candidates = raw_result.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                text_content = parts[0].get("text", "")

        try:
            parsed = json.loads(text_content)
        except Exception:
            parsed = {"answer": text_content, "cited_source_ids": [], "confidence": "moderate"}

        return AIProviderRawResponse(
            answer=parsed.get("answer", "Investigation summary could not be generated."),
            confidence=parsed.get("confidence", "moderate"),
            cited_source_ids=parsed.get("cited_source_ids", []),
            related_findings=parsed.get("related_findings", []),
            related_hypotheses=parsed.get("related_hypotheses", []),
            suggested_questions=parsed.get("suggested_questions", []),
            raw_metadata=raw_result.get("usageMetadata", {}),
        )
