import logging
import shutil
import subprocess
import time
from pathlib import Path

from app.infrastructure.settings import Settings

logger = logging.getLogger(__name__)


class GitClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def prepare_repository(self, repository_ref: str, repository_id: str) -> Path:
        maybe_local = Path(repository_ref).expanduser()
        if maybe_local.exists() and maybe_local.is_dir():
            return maybe_local.resolve()

        workspace = Path(self._settings.repo_workspace)
        workspace.mkdir(parents=True, exist_ok=True)
        target = workspace / repository_id
        if target.exists():
            shutil.rmtree(target)
        cmd = ["git", "clone", "--depth", "1", repository_ref, str(target)]
        logger.info("cloning | url=%s | target=%s", repository_ref, target)
        t0 = time.perf_counter()
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            logger.error("clone failed | url=%s | stderr=%s", repository_ref, result.stderr.strip())
            raise ValueError(result.stderr.strip() or "unable to clone repository")
        logger.info("clone done | url=%s | elapsed=%.1fs", repository_ref, time.perf_counter() - t0)
        return target.resolve()