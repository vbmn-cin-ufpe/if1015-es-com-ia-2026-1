from pathlib import Path


class IngestionService:
    def collect_python_files(self, repo_path: Path) -> list[Path]:
        excluded = {".git", "node_modules", "venv", ".venv", "__pycache__", "dist", "build"}
        files: list[Path] = []
        for file_path in repo_path.rglob("*.py"):
            if any(part in excluded for part in file_path.parts):
                continue
            files.append(file_path)
        return sorted(files)