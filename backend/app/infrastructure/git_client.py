import shutil
import subprocess
from pathlib import Path

from app.infrastructure.settings import get_settings


class GitClient:
    def __init__(self) -> None:
        self._settings = get_settings()

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
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            raise ValueError(result.stderr.strip() or "unable to clone repository")
        return target.resolve()