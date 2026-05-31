from pydantic import BaseModel, Field


class RepositoryIndexRequest(BaseModel):
    repository_url: str = Field(min_length=1)


class RepositoryIndexResponse(BaseModel):
    repository_id: str
    job_status: str


class RepositoryStatusResponse(BaseModel):
    repository_id: str
    index_status: str
    stats: dict
    error_message: str | None = None


class ChatAskRequest(BaseModel):
    repository_id: str = Field(min_length=1)
    question: str = Field(min_length=1)


class ChatSource(BaseModel):
    chunk_id: str
    file_path: str
    start_line: int
    end_line: int
    score: float


class ChatAskResponse(BaseModel):
    answer: str
    sources: list[ChatSource]