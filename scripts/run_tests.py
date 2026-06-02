import subprocess
import sys


def run(cmd: list[str]) -> None:
    result = subprocess.run(cmd, check=False)
    if result.returncode != 0:
        sys.exit(result.returncode)


def main() -> None:
    run(["pytest", "backend/tests/unit"])
    run(["pytest", "backend/tests/integration"])
    run(["pytest", "backend/tests/e2e"])
    run(["npm", "--prefix", "frontend", "test"])


if __name__ == "__main__":
    main()