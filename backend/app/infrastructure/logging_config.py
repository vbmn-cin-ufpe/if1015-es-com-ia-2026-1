"""Centralized logging configuration for the CodeCompass backend.

Call ``configure_logging()`` once at application startup.  All modules should
obtain their loggers via ``logging.getLogger(__name__)``; the root logger
handler configured here takes care of formatting and routing.
"""

import logging
import sys


def configure_logging(log_level: str = "INFO") -> None:
    """Configure the root logger with a consistent, container-friendly format.

    Format: ``timestamp | LEVEL    | module-name | message``

    Third-party libraries that are excessively chatty (transformers, torch,
    chromadb, …) are demoted to WARNING so that application-level logs remain
    readable when tailing Docker container output.

    Args:
        log_level: Desired log level string.  Accepts DEBUG, INFO, WARNING,
                   ERROR, CRITICAL (case-insensitive).  Defaults to INFO.
    """
    level = getattr(logging, log_level.upper(), logging.INFO)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)-45s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.setLevel(level)

    root = logging.getLogger()
    root.setLevel(level)
    # Avoid duplicate log lines when the function is called more than once
    root.handlers.clear()
    root.addHandler(handler)

    # ── silence noisy third-party libraries ──────────────────────────────────
    _QUIET = [
        "uvicorn.access",
        "httpx",
        "httpcore",
        "sentence_transformers",
        "transformers",
        "torch",
        "chromadb",
        "opentelemetry",
        "urllib3",
        "filelock",
        "huggingface_hub",
    ]
    for name in _QUIET:
        logging.getLogger(name).setLevel(logging.WARNING)
