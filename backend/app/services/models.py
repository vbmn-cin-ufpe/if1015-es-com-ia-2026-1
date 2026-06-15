from typing import Any

from pydantic import BaseModel, Field

# Note: RepositoryRecord is defined in app.ports to avoid circular dependencies
# between infrastructure and services layers


class RepositoryIndexRequest(BaseModel):
    repository_url: str = Field(min_length=1)


class RepositoryIndexResponse(BaseModel):
    repository_id: str
    job_status: str


class RepositoryStatusResponse(BaseModel):
    repository_id: str
    repository_url: str = ""
    index_status: str
    stats: dict[str, Any]
    error_message: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


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


# Tour Models

class TourStepMetrics(BaseModel):
    complexity: dict[str, Any]
    churn: dict[str, Any]
    coupling: dict[str, Any]


class TourStep(BaseModel):
    step_number: int
    module_name: str
    title: str
    score: float
    rationale: str
    metrics: TourStepMetrics
    recommendations: list[str]


class TourResponse(BaseModel):
    tour_id: str
    repository_id: str
    title: str
    description: str
    step_count: int
    steps: list[TourStep]
    created_at: str | None = None
    config: dict[str, Any] | None = None


class GenerateTourRequest(BaseModel):
    repository_id: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)
    complexity_weight: float = Field(default=0.4, ge=0.0, le=1.0)
    churn_weight: float = Field(default=0.3, ge=0.0, le=1.0)
    coupling_weight: float = Field(default=0.3, ge=0.0, le=1.0)


class TourSummary(BaseModel):
    tour_id: str
    repository_id: str
    title: str
    description: str
    step_count: int
    created_at: str
    config: dict[str, Any]


class TourListResponse(BaseModel):
    repository_id: str
    tours: list[TourSummary]


# Dependency Graph Models

class GraphNodeMetrics(BaseModel):
    in_degree: int
    out_degree: int
    total_degree: int


class GraphNode(BaseModel):
    id: str
    label: str
    module_path: str
    metrics: GraphNodeMetrics


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str


class GraphPayloadResponse(BaseModel):
    repository_id: str
    snapshot_id: str
    node_count: int
    edge_count: int
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    created_at: str | None = None


class ModuleDependencyDetail(BaseModel):
    source: str | None = None
    target: str | None = None
    type: str


class ModuleDetailsResponse(BaseModel):
    module_path: str
    label: str
    metrics: GraphNodeMetrics
    inbound_dependencies: list[ModuleDependencyDetail]
    outbound_dependencies: list[ModuleDependencyDetail]


# Commit History / Timeline Models

class TimelineEntry(BaseModel):
    id: str
    position: int
    commit_id: str
    repository_id: str
    timestamp: str
    author: str = ""
    category: str
    confidence: float
    summary: str
    touched_modules: list[str]


class TimelineResponse(BaseModel):
    repository_id: str
    module_path: str | None = None
    category: str | None = None
    total: int
    offset: int = 0
    entries: list[TimelineEntry]


class WhyRequest(BaseModel):
    module_path: str = Field(min_length=1)
    question: str = Field(min_length=1)


class SupportingCommit(BaseModel):
    commit_id: str
    timestamp: str
    category: str
    summary: str
    confidence: float


class WhyResponse(BaseModel):
    module_path: str
    question: str
    explanation: str
    supporting_commits: list[SupportingCommit]
    confidence: float


# Metrics / Feedback Models

class FeedbackRequest(BaseModel):
    repository_id: str = Field(min_length=1)
    response_id: str = Field(min_length=1)
    usefulness_score: int = Field(ge=1, le=5)
    correctness_score: int = Field(ge=1, le=5)
    comment: str = ""


class FeedbackResponse(BaseModel):
    feedback_id: str
    status: str


class MetricsPayload(BaseModel):
    total_events: int
    total_feedback: int
    response_latency_p50: float
    response_latency_p95: float
    onboarding_flow_completion_rate: float
    answer_usefulness_rate: float
    answer_correctness_rate: float
    feedback_coverage_rate: float


class MetricsResponse(BaseModel):
    repository_id: str
    period_start: str | None = None
    period_end: str | None = None
    metrics: MetricsPayload


class QualityReportResponse(BaseModel):
    repository_id: str
    period_start: str
    period_end: str
    metrics: MetricsPayload
    quality_label: str
    overall_quality_score: float
    summary: str