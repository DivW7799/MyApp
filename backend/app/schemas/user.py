from uuid import UUID

from pydantic import BaseModel, Field


class AdminUserListItem(BaseModel):
    id: UUID
    username: str
    account_type: str
    is_active: bool
    must_change_password: bool


class AdminUserDetail(AdminUserListItem):
    pass


class AdminUserUpdateRequest(BaseModel):
    username: str | None = Field(
        default=None,
        min_length=3,
        max_length=100,
    )
    account_type: str | None = Field(
        default=None,
        pattern="^[AU]$",
    )
    is_active: bool | None = None