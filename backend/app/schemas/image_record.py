from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ImageRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    text: str
    original_filename: str
    content_type: str
    size_bytes: int
    created_at: datetime