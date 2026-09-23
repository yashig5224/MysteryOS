from pydantic import BaseModel

class ReportRequest(BaseModel):
    investigation_id: str
