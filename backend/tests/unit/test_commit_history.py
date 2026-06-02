"""Unit tests for commit history classification and timeline services."""

from app.services.commit_history_service import (
    CommitDecision,
    CommitRecord,
    DecisionClassificationService,
)
from app.services.timeline_service import TimelineService, WhyExplanationService


class TestDecisionClassification:
    """Test the pattern-based decision classifier."""

    def setup_method(self):
        self.classifier = DecisionClassificationService()

    def test_classifies_bugfix(self):
        commit = CommitRecord(
            commit_id="abc123",
            repository_id="repo1",
            author="dev@test.com",
            timestamp="2024-01-15T10:00:00",
            message="fix: resolve null pointer in parser",
            files_changed=["src/parser.py"],
        )
        decision = self.classifier.classify(commit)
        assert decision.category == "bugfix"
        assert decision.confidence > 0.5

    def test_classifies_feature(self):
        commit = CommitRecord(
            commit_id="def456",
            repository_id="repo1",
            author="dev@test.com",
            timestamp="2024-01-15T11:00:00",
            message="feat: add user authentication endpoint",
            files_changed=["src/auth.py", "src/routes.py"],
        )
        decision = self.classifier.classify(commit)
        assert decision.category == "feature"

    def test_classifies_refactor(self):
        commit = CommitRecord(
            commit_id="ghi789",
            repository_id="repo1",
            author="dev@test.com",
            timestamp="2024-01-15T12:00:00",
            message="refactor: extract validation logic into separate module",
            files_changed=["src/validation.py"],
        )
        decision = self.classifier.classify(commit)
        assert decision.category == "refactor"

    def test_classifies_documentation(self):
        commit = CommitRecord(
            commit_id="jkl012",
            repository_id="repo1",
            author="dev@test.com",
            timestamp="2024-01-15T13:00:00",
            message="docs: update README with setup instructions",
            files_changed=["README.md"],
        )
        decision = self.classifier.classify(commit)
        assert decision.category == "documentation"

    def test_classifies_test(self):
        commit = CommitRecord(
            commit_id="mno345",
            repository_id="repo1",
            author="dev@test.com",
            timestamp="2024-01-15T14:00:00",
            message="test: add unit tests for user service",
            files_changed=["tests/test_user.py"],
        )
        decision = self.classifier.classify(commit)
        assert decision.category == "test"

    def test_classifies_unknown_as_other(self):
        commit = CommitRecord(
            commit_id="pqr678",
            repository_id="repo1",
            author="dev@test.com",
            timestamp="2024-01-15T15:00:00",
            message="misc changes",
            files_changed=["config.yaml"],
        )
        decision = self.classifier.classify(commit)
        assert decision.category == "other"
        assert decision.confidence < 0.5

    def test_classify_batch(self):
        commits = [
            CommitRecord(
                commit_id=f"id{i}",
                repository_id="repo1",
                author="dev@test.com",
                timestamp=f"2024-01-{15+i}T10:00:00",
                message=msg,
                files_changed=["file.py"],
            )
            for i, msg in enumerate(["fix bug", "add feature", "refactor code"])
        ]
        decisions = self.classifier.classify_batch(commits)
        assert len(decisions) == 3
        assert all(isinstance(d, CommitDecision) for d in decisions)

    def test_touched_modules_from_files(self):
        commit = CommitRecord(
            commit_id="xyz",
            repository_id="repo1",
            author="dev@test.com",
            timestamp="2024-01-20T10:00:00",
            message="fix: bug in module",
            files_changed=["src/services/auth.py", "src/controllers/user.py"],
        )
        decision = self.classifier.classify(commit)
        assert "src/services/auth.py" in decision.touched_modules
        assert "src/controllers/user.py" in decision.touched_modules


class TestTimelineService:
    """Test timeline building and filtering."""

    def setup_method(self):
        self.service = TimelineService()
        self.decisions = [
            CommitDecision(
                id="d1",
                commit_id="c1",
                repository_id="repo1",
                timestamp="2024-01-20T10:00:00",
                category="bugfix",
                confidence=0.9,
                summary="Fix parsing bug",
                touched_modules=["src/parser.py"],
            ),
            CommitDecision(
                id="d2",
                commit_id="c2",
                repository_id="repo1",
                timestamp="2024-01-21T10:00:00",
                category="feature",
                confidence=0.85,
                summary="Add new endpoint",
                touched_modules=["src/api.py", "src/parser.py"],
            ),
            CommitDecision(
                id="d3",
                commit_id="c3",
                repository_id="repo1",
                timestamp="2024-01-22T10:00:00",
                category="refactor",
                confidence=0.8,
                summary="Extract validation",
                touched_modules=["src/validation.py"],
            ),
        ]

    def test_build_timeline_returns_all(self):
        entries = self.service.build_timeline(self.decisions)
        assert len(entries) == 3

    def test_build_timeline_newest_first(self):
        entries = self.service.build_timeline(self.decisions)
        assert entries[0]["timestamp"] > entries[1]["timestamp"]
        assert entries[1]["timestamp"] > entries[2]["timestamp"]

    def test_filter_by_module(self):
        entries = self.service.build_timeline(self.decisions, module_path="src/parser.py")
        assert len(entries) == 2
        for e in entries:
            assert "src/parser.py" in e["touched_modules"]

    def test_filter_by_category(self):
        entries = self.service.build_timeline(self.decisions, category="bugfix")
        assert len(entries) == 1
        assert entries[0]["category"] == "bugfix"

    def test_limit(self):
        entries = self.service.build_timeline(self.decisions, limit=2)
        assert len(entries) == 2

    def test_combined_filters(self):
        entries = self.service.build_timeline(
            self.decisions, module_path="src/parser.py", category="feature"
        )
        assert len(entries) == 1
        assert entries[0]["category"] == "feature"

    def test_position_is_sequential(self):
        entries = self.service.build_timeline(self.decisions)
        for i, e in enumerate(entries):
            assert e["position"] == i + 1


class TestWhyExplanationService:
    """Test the why-explanation generation."""

    def setup_method(self):
        self.service = WhyExplanationService(llm_port=None)
        self.decisions = [
            CommitDecision(
                id="d1",
                commit_id="c1",
                repository_id="repo1",
                timestamp="2024-01-20T10:00:00",
                category="bugfix",
                confidence=0.9,
                summary="Fix parsing bug in tokenizer",
                touched_modules=["src/parser.py"],
            ),
            CommitDecision(
                id="d2",
                commit_id="c2",
                repository_id="repo1",
                timestamp="2024-01-21T10:00:00",
                category="bugfix",
                confidence=0.85,
                summary="Fix edge case in parser regex",
                touched_modules=["src/parser.py"],
            ),
        ]

    def test_explain_with_evidence(self):
        result = self.service.explain_why(
            module_path="src/parser.py",
            question="Why so many bugs?",
            decisions=self.decisions,
        )
        assert result["module_path"] == "src/parser.py"
        assert result["question"] == "Why so many bugs?"
        assert len(result["supporting_commits"]) == 2
        assert result["confidence"] > 0
        assert "parser" in result["explanation"].lower()

    def test_explain_no_evidence(self):
        result = self.service.explain_why(
            module_path="src/unknown.py",
            question="What happened?",
            decisions=self.decisions,
        )
        assert result["confidence"] == 0.0
        assert len(result["supporting_commits"]) == 0
        assert "no commit history" in result["explanation"].lower()

    def test_explain_limits_evidence(self):
        many_decisions = [
            CommitDecision(
                id=f"d{i}",
                commit_id=f"c{i}",
                repository_id="repo1",
                timestamp=f"2024-01-{i:02d}T10:00:00",
                category="bugfix",
                confidence=0.8,
                summary=f"Fix issue #{i}",
                touched_modules=["src/parser.py"],
            )
            for i in range(1, 25)
        ]
        result = self.service.explain_why(
            module_path="src/parser.py",
            question="Why so many changes?",
            decisions=many_decisions,
            max_evidence=5,
        )
        assert len(result["supporting_commits"]) == 5
