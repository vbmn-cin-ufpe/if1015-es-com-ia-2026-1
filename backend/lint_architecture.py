"""Architecture validation and lint checks."""

import ast
import sys
from pathlib import Path
from typing import Any


class ArchitectureLinter:
    """Validates architectural boundaries and best practices."""

    def __init__(self, backend_path: Path):
        self.backend_path = backend_path
        self.app_path = backend_path / "app"
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def run_all_checks(self) -> bool:
        """Run all architecture validation checks."""
        print("=" * 60)
        print("Running Architecture Lint Checks")
        print("=" * 60)
        
        self.check_layer_dependencies()
        self.check_import_patterns()
        self.check_controller_purity()
        self.check_service_dependencies()
        
        return self.report_results()

    def check_layer_dependencies(self) -> None:
        """Verify that layers only depend on allowed layers."""
        print("\n✓ Checking layer dependencies...")
        
        rules = {
            "controllers": ["services", "ports", "dependencies"],
            "services": ["infrastructure", "ports"],  # Services can import infrastructure for Settings only
            "infrastructure": [],  # No app imports except settings
            "ports": [],  # No app imports except TYPE_CHECKING
        }
        
        for layer, allowed in rules.items():
            layer_path = self.app_path / layer
            if not layer_path.exists():
                continue
            
            for py_file in layer_path.rglob("*.py"):
                if py_file.name == "__init__.py":
                    continue
                    
                violations = self._check_file_imports(py_file, layer, allowed)
                if violations:
                    self.errors.append(f"{py_file.name}: {violations}")

    def check_import_patterns(self) -> None:
        """Check for anti-patterns in imports."""
        print("✓ Checking import patterns...")
        
        # Controllers should not import adapters directly
        for controller_file in (self.app_path / "controllers").rglob("*.py"):
            content = controller_file.read_text(encoding="utf-8")
            
            if "from app.infrastructure" in content and "settings" not in content.lower():
                self.errors.append(
                    f"{controller_file.name}: Controllers should not import infrastructure "
                    f"adapters directly (use dependency injection)"
                )

    def check_controller_purity(self) -> None:
        """Verify controllers only orchestrate, don't contain business logic."""
        print("✓ Checking controller purity...")
        
        controllers_path = self.app_path / "controllers"
        if not controllers_path.exists():
            return
            
        for py_file in controllers_path.rglob("*.py"):
            if py_file.name == "__init__.py":
                continue
                
            tree = ast.parse(py_file.read_text(encoding="utf-8"))
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    # Check if function has complex logic (more than just calling service)
                    if len(node.body) > 5:  # Arbitrary threshold
                        self.warnings.append(
                            f"{py_file.name}::{node.name}: Function may have too much logic "
                            f"({len(node.body)} statements)"
                        )

    def check_service_dependencies(self) -> None:
        """Check that services depend on ports, not concrete implementations."""
        print("✓ Checking service dependencies on ports...")
        
        services_path = self.app_path / "services"
        if not services_path.exists():
            return
            
        for py_file in services_path.rglob("*.py"):
            if py_file.name in ["__init__.py", "models.py", "ingestion_service.py"]:
                continue
                
            content = py_file.read_text(encoding="utf-8")
            tree = ast.parse(content)
            
            # Find __init__ method
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef) and node.name == "__init__":
                    for arg in node.args.args[1:]:  # Skip self
                        # Check type annotation
                        if arg.annotation:
                            type_name = ast.unparse(arg.annotation)
                            
                            # Should use Port interfaces, not Adapter classes
                            # Exception: *Port types ARE the interfaces
                            if ("Adapter" in type_name or "Client" in type_name) and "Port" not in type_name:
                                self.errors.append(
                                    f"{py_file.name}: Parameter '{arg.arg}' uses concrete "
                                    f"type '{type_name}' instead of Port interface"
                                )

    def _check_file_imports(self, file_path: Path, layer: str, allowed_layers: list[str]) -> str:
        """Check imports in a file against allowed layers."""
        content = file_path.read_text(encoding="utf-8")
        
        forbidden_imports = []
        
        # Check for imports from app.* that are not allowed
        for line in content.splitlines():
            if not line.strip().startswith(("from app.", "import app.")):
                continue
                
            # Extract the layer being imported
            if "from app." in line:
                parts = line.split("from app.")[1].split()[0].split(".")
                imported_layer = parts[0]
            elif "import app." in line:
                parts = line.split("import app.")[1].split()[0].split(".")
                imported_layer = parts[0]
            else:
                continue
            
            # Special cases
            if imported_layer in ["ports", "dependencies"]:
                # These are OK for most layers
                continue
            
            if imported_layer == "infrastructure" and "settings" in line.lower():
                # Settings import is OK
                continue
                
            if imported_layer == "services" and layer == "services":
                # Services can import other services
                continue
            
            if imported_layer not in allowed_layers:
                forbidden_imports.append(f"imports app.{imported_layer}")
        
        return ", ".join(forbidden_imports) if forbidden_imports else ""

    def report_results(self) -> bool:
        """Print report and return success status."""
        print("\n" + "=" * 60)
        print("LINT RESULTS")
        print("=" * 60)
        
        if self.errors:
            print(f"\n❌ {len(self.errors)} ERROR(S) FOUND:\n")
            for error in self.errors:
                print(f"  ✗ {error}")
        
        if self.warnings:
            print(f"\n⚠️  {len(self.warnings)} WARNING(S):\n")
            for warning in self.warnings:
                print(f"  ! {warning}")
        
        if not self.errors and not self.warnings:
            print("\n✅ All architecture checks passed!")
            print("\n✨ Code structure follows:")
            print("   - Dependency Inversion Principle (SOLID-D)")
            print("   - Hexagonal Architecture (Ports & Adapters)")
            print("   - Clean separation of concerns")
            print("   - Proper dependency injection")
            return True
        elif not self.errors:
            print("\n✅ No critical errors found (only warnings)")
            return True
        else:
            print(f"\n❌ Found {len(self.errors)} critical error(s)")
            print("Please fix the errors above to maintain architecture integrity.")
            return False


def main() -> int:
    """Run architecture linting."""
    backend_path = Path(__file__).parent
    linter = ArchitectureLinter(backend_path)
    
    success = linter.run_all_checks()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ Architecture validation PASSED")
        return 0
    else:
        print("❌ Architecture validation FAILED")
        return 1


if __name__ == "__main__":
    sys.exit(main())
