"""Unit tests for observability services."""

from app.services.observability_service import (
    MetricsCollector,
    StructuredLogger,
    get_correlation_id,
    set_correlation_id,
)


class TestStructuredLogger:
    def test_info_formats_entry(self, caplog):
        logger = StructuredLogger(service="test-svc")
        import logging
        with caplog.at_level(logging.INFO):
            logger.info("indexing", "start", "Beginning index")
        assert "indexing" in caplog.text
        assert "test-svc" in caplog.text

    def test_error_includes_code(self, caplog):
        logger = StructuredLogger()
        import logging
        with caplog.at_level(logging.ERROR):
            logger.error("chat", "llm_call", "Timeout", error_code="TIMEOUT")
        assert "TIMEOUT" in caplog.text


class TestCorrelationId:
    def test_set_and_get(self):
        cid = set_correlation_id("test-123")
        assert cid == "test-123"
        assert get_correlation_id() == "test-123"

    def test_auto_generate(self):
        set_correlation_id(None)
        cid = get_correlation_id()
        assert len(cid) > 0


class TestMetricsCollector:
    def setup_method(self):
        self.collector = MetricsCollector()

    def test_record_metric(self):
        self.collector.record("test_metric", 1.5, {"op": "test"})
        metrics = self.collector.get_metrics()
        assert len(metrics) == 1
        assert metrics[0].name == "test_metric"
        assert metrics[0].value == 1.5

    def test_record_latency(self):
        self.collector.record_latency("indexing", 2.5, status="success")
        metrics = self.collector.get_metrics(name_prefix="indexing")
        assert len(metrics) == 1
        assert "latency" in metrics[0].name

    def test_record_error(self):
        self.collector.record_error("chat", error_code="500")
        metrics = self.collector.get_metrics(name_prefix="chat")
        assert len(metrics) == 1
        assert "error" in metrics[0].name

    def test_get_summary(self):
        self.collector.record_latency("indexing", 1.0)
        self.collector.record_latency("indexing", 3.0)
        self.collector.record_error("indexing", "500")
        summary = self.collector.get_summary()
        assert summary["total_points"] == 3

    def test_filter_by_prefix(self):
        self.collector.record("aaa_metric", 1.0)
        self.collector.record("bbb_metric", 2.0)
        results = self.collector.get_metrics(name_prefix="aaa")
        assert len(results) == 1


class TestAlertEvaluation:
    def test_ok_status(self):
        from app.controllers.ops_controller import AlertEvaluationService, DependencyStatus
        svc = AlertEvaluationService()
        deps = [DependencyStatus(name="pg", status="healthy")]
        result = svc.evaluate(deps, {"operations": {}})
        assert result == "ok"

    def test_warning_on_degraded(self):
        from app.controllers.ops_controller import AlertEvaluationService, DependencyStatus
        svc = AlertEvaluationService()
        deps = [DependencyStatus(name="pg", status="degraded")]
        result = svc.evaluate(deps, {"operations": {}})
        assert result == "warning"

    def test_critical_on_multiple_degraded(self):
        from app.controllers.ops_controller import AlertEvaluationService, DependencyStatus
        svc = AlertEvaluationService()
        deps = [
            DependencyStatus(name="pg", status="degraded"),
            DependencyStatus(name="chroma", status="degraded"),
        ]
        result = svc.evaluate(deps, {"operations": {}})
        assert result == "critical"
