"""Tour generation and module scoring services."""

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from app.ports import RepositoryMetadataPort, TourRecord, TourRepositoryPort, TourStepRecord
from app.services.analyzers import ChurnAnalyzer, ComplexityAnalyzer, CouplingAnalyzer

logger = logging.getLogger(__name__)


class ModuleScoringService:
    """Scores modules based on complexity, churn, and coupling metrics."""

    def __init__(
        self,
        complexity_weight: float = 0.4,
        churn_weight: float = 0.3,
        coupling_weight: float = 0.3,
    ):
        self.complexity_weight = complexity_weight
        self.churn_weight = churn_weight
        self.coupling_weight = coupling_weight
        self.complexity_analyzer = ComplexityAnalyzer()

    def score_module(
        self,
        module_name: str,
        module_files: list[Path],
        repo_root: Path,
    ) -> dict[str, Any]:
        """Score a single module based on multiple metrics.
        
        Args:
            module_name: Name/path of the module
            module_files: List of Python files in the module
            repo_root: Root path of the repository
            
        Returns:
            Dict with scores and metrics
        """
        # Get metrics from analyzers
        complexity_metrics = self.complexity_analyzer.analyze_module(module_files)
        
        churn_analyzer = ChurnAnalyzer(repo_root)
        churn_metrics = churn_analyzer.analyze_module_churn(module_files)
        
        coupling_analyzer = CouplingAnalyzer()
        coupling_metrics = coupling_analyzer.analyze_module_coupling(module_files, repo_root)
        
        # Per-file metrics (commits + dependencies)
        file_details: list[dict[str, Any]] = []
        for f in sorted(module_files, key=lambda p: p.name)[:20]:
            rel = str(f.relative_to(repo_root)).replace("\\", "/")
            file_churn = churn_analyzer.analyze_file_churn(f)
            file_coupling = coupling_analyzer.analyze_file_coupling(f, repo_root)
            file_complexity = self.complexity_analyzer.analyze_file(f)
            file_details.append({
                "path": rel,
                "name": f.name,
                "commits": file_churn,
                "dependencies": file_coupling["total_imports"],
                "complexity": round(file_complexity.get("complexity", 0), 1),
                "loc": file_complexity.get("loc", 0),
            })
        
        # Normalize scores (simple min-max style, can be improved)
        complexity_score = min(complexity_metrics["avg_complexity"] / 10.0, 1.0)
        churn_score = min(churn_metrics["avg_commits_per_file"] / 20.0, 1.0)
        coupling_score = min(coupling_metrics["avg_imports_per_file"] / 15.0, 1.0)
        
        # Weighted final score
        final_score = (
            complexity_score * self.complexity_weight
            + churn_score * self.churn_weight
            + coupling_score * self.coupling_weight
        )
        
        return {
            "module_name": module_name,
            "score": final_score,
            "complexity_score": complexity_score,
            "churn_score": churn_score,
            "coupling_score": coupling_score,
            "file_count": len(module_files),
            "files": sorted(
                str(f.relative_to(repo_root)).replace("\\", "/")
                for f in module_files[:20]
            ),
            "file_details": file_details,
            "metrics": {
                "complexity": complexity_metrics,
                "churn": churn_metrics,
                "coupling": coupling_metrics,
            },
        }

    def rank_modules(
        self,
        repo_root: Path,
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        """Identify and rank the top K most critical modules.
        
        Args:
            repo_root: Root path of the repository
            top_k: Number of top modules to return
            
        Returns:
            List of scored modules, sorted by score (highest first)
        """
        # Discover modules (Python packages with __init__.py or standalone files)
        modules = self._discover_modules(repo_root)
        
        # Score each module
        scored_modules = []
        for module_name, files in modules.items():
            try:
                score_data = self.score_module(module_name, files, repo_root)
                scored_modules.append(score_data)
            except Exception as e:
                logger.warning(f"Error scoring module {module_name}: {e}")
        
        # Sort by score (descending)
        scored_modules.sort(key=lambda x: x["score"], reverse=True)
        
        return scored_modules[:top_k]

    def _discover_modules(self, repo_root: Path) -> dict[str, list[Path]]:
        """Discover source modules in the repository (all supported languages).

        Groups files by their parent directory.  Root-level files become their
        own single-file module.  Excluded directories are skipped.
        """
        from app.services.language_registry import all_languages

        # Directories that contain non-production code and should be ignored
        _EXCLUDED = {
            ".git", "venv", ".venv", "__pycache__", "node_modules",
            "dist", "build", "vendor",
            # Non-source directories — samples, tests, fixtures, docs
            "sample", "samples", "example", "examples", "e2e",
            "test", "tests", "__tests__", "spec", "specs",
            "fixture", "fixtures", "mock", "mocks",
            "benchmark", "benchmarks", "docs", "doc",
            "scripts", "tools", "hack", "ci", ".github",
        }
        extensions = {ext for spec in all_languages() for ext in spec.extensions}

        modules: dict[str, list[Path]] = {}

        for f in repo_root.rglob("*"):
            if not f.is_file():
                continue
            if any(part in _EXCLUDED for part in f.parts):
                continue
            if f.suffix.lower() not in extensions:
                continue

            try:
                relative = f.relative_to(repo_root)
                parts = relative.parts[:-1]  # directory path without filename
                module_name = "/".join(parts) if parts else f.stem
            except ValueError:
                continue

            modules.setdefault(module_name, []).append(f)

        return modules


class TourGenerationService:
    """Generates guided tours from ranked modules."""

    def __init__(
        self,
        scoring_service: ModuleScoringService,
        metadata_adapter: RepositoryMetadataPort,
        tour_repository: TourRepositoryPort | None = None,
    ):
        self.scoring_service = scoring_service
        self.metadata_adapter = metadata_adapter
        self.tour_repository = tour_repository

    def generate_tour(
        self,
        repository_id: str,
        repo_root: Path,
        top_k: int = 5,
        complexity_weight: float = 0.4,
        churn_weight: float = 0.3,
        coupling_weight: float = 0.3,
    ) -> dict[str, Any]:
        """Generate a guided tour for a repository.
        
        Args:
            repository_id: Repository identifier
            repo_root: Root path of the repository
            top_k: Number of modules to include in the tour
            
        Returns:
            Tour data structure with ordered steps
        """
        # Get repository metadata
        repo_record = self.metadata_adapter.get_repository(repository_id)
        if not repo_record:
            raise ValueError("Repository not found")

        # Create scoring service with requested weights
        scoring = ModuleScoringService(
            complexity_weight=complexity_weight,
            churn_weight=churn_weight,
            coupling_weight=coupling_weight,
        )

        # Rank modules
        ranked_modules = scoring.rank_modules(repo_root, top_k)

        # Generate tour ID and timestamp
        tour_id = str(uuid4())
        created_at = datetime.now(timezone.utc).isoformat()

        # Build tour steps
        steps = []
        for idx, module_data in enumerate(ranked_modules, 1):
            step = {
                "step_number": idx,
                "module_name": module_data["module_name"],
                "title": f"Module: {module_data['module_name']}",
                "score": module_data["score"],
                "score_breakdown": {
                    "complexity": round(module_data["complexity_score"], 3),
                    "churn": round(module_data["churn_score"], 3),
                    "coupling": round(module_data["coupling_score"], 3),
                },
                "file_count": module_data["file_count"],
                "files": module_data["files"],
                "file_details": module_data["file_details"],
                "rationale": self._generate_rationale(module_data),
                "metrics": module_data["metrics"],
                "recommendations": self._generate_recommendations(module_data),
            }
            steps.append(step)

        config = {
            "top_k": top_k,
            "complexity_weight": complexity_weight,
            "churn_weight": churn_weight,
            "coupling_weight": coupling_weight,
        }

        tour = {
            "tour_id": tour_id,
            "repository_id": repository_id,
            "title": f"Guided Tour: {repo_record.repository_url}",
            "description": f"Top {top_k} critical modules for onboarding",
            "step_count": len(steps),
            "steps": steps,
            "created_at": created_at,
            "config": config,
        }

        # Persist the tour if a repository adapter is wired
        if self.tour_repository is not None:
            self._persist_tour(tour)

        return tour

    def _persist_tour(self, tour_data: dict[str, Any]) -> None:
        """Convert tour dict to domain model and persist."""
        if self.tour_repository is None:
            return
        try:
            tour_record = TourRecord(
                tour_id=tour_data["tour_id"],
                repository_id=tour_data["repository_id"],
                title=tour_data["title"],
                description=tour_data["description"],
                step_count=tour_data["step_count"],
                config=tour_data["config"],
                created_at=tour_data["created_at"],
                steps=[
                    TourStepRecord(
                        step_id=str(uuid4()),
                        tour_id=tour_data["tour_id"],
                        position=step["step_number"],
                        module_path=step["module_name"],
                        title=step["title"],
                        score=step["score"],
                        rationale=step["rationale"],
                        recommendations=step["recommendations"],
                        metrics=step["metrics"],
                    )
                    for step in tour_data["steps"]
                ],
            )
            self.tour_repository.save_tour(tour_record)
        except Exception as exc:
            logger.error("Failed to persist tour: %s", exc)

    def get_tour(self, tour_id: str) -> dict[str, Any] | None:
        """Retrieve a previously generated tour by ID."""
        if self.tour_repository is None:
            return None
        record = self.tour_repository.get_tour(tour_id)
        if not record:
            return None
        return {
            "tour_id": record.tour_id,
            "repository_id": record.repository_id,
            "title": record.title,
            "description": record.description,
            "step_count": record.step_count,
            "created_at": record.created_at,
            "config": record.config,
            "steps": [
                {
                    "step_number": s.position,
                    "module_name": s.module_path,
                    "title": s.title,
                    "score": s.score,
                    "rationale": s.rationale,
                    "recommendations": s.recommendations,
                    "metrics": s.metrics,
                }
                for s in record.steps
            ],
        }

    def list_tours(self, repository_id: str) -> list[dict[str, Any]]:
        """List all tours for a repository (summary only, no steps)."""
        if self.tour_repository is None:
            return []
        records = self.tour_repository.list_tours(repository_id)
        return [
            {
                "tour_id": r.tour_id,
                "repository_id": r.repository_id,
                "title": r.title,
                "description": r.description,
                "step_count": r.step_count,
                "created_at": r.created_at,
                "config": r.config,
            }
            for r in records
        ]

    def _generate_rationale(self, module_data: dict[str, Any]) -> str:
        """Generate explanation for why this module is critical."""
        reasons = []

        complexity = module_data["metrics"]["complexity"]
        churn = module_data["metrics"]["churn"]
        coupling = module_data["metrics"]["coupling"]
        module_name = module_data["module_name"]

        avg_cc = complexity.get("avg_complexity", 0)
        if avg_cc > 7:
            reasons.append(
                f"Alta complexidade ciclomática (média {avg_cc:.1f}) — este módulo contém lógica "
                f"intrincada que novos desenvolvedores precisam entender com cuidado"
            )
        elif avg_cc > 3:
            reasons.append(
                f"Complexidade moderada (média {avg_cc:.1f}) — envolve fluxos de controle não triviais"
            )

        total_commits = churn.get("total_commits", 0)
        if total_commits > 30:
            reasons.append(
                f"Alto volume de mudanças ({total_commits} commits) — ponto ativo de evolução do sistema"
            )
        elif total_commits > 10:
            reasons.append(
                f"Modificado frequentemente ({total_commits} commits) — área de desenvolvimento ativo"
            )

        unique_deps = coupling.get("unique_dependencies", 0)
        if unique_deps > 8:
            reasons.append(
                f"Hub de dependências ({unique_deps} módulos dependentes) — mudanças aqui afetam "
                f"grande parte do sistema"
            )
        elif unique_deps > 3:
            reasons.append(
                f"Acoplado a {unique_deps} outros módulos — papel integrador na arquitetura"
            )

        path_lower = module_name.lower()
        if any(kw in path_lower for kw in ["core", "kernel", "base", "common", "shared"]):
            reasons.append("Nome indica módulo núcleo compartilhado por múltiplos subsistemas")
        elif any(kw in path_lower for kw in ["service", "services"]):
            reasons.append("Camada de serviços — contém regras de negócio centrais")
        elif any(kw in path_lower for kw in ["controller", "controllers", "router", "routes"]):
            reasons.append("Camada de controle — ponto de entrada das requisições")
        elif any(kw in path_lower for kw in ["module", "modules"]):
            reasons.append("Módulo de composição — organiza e conecta dependências do sistema")

        if not reasons:
            reasons.append(
                f"Módulo '{module_name}' identificado como relevante pela combinação de "
                f"complexidade, frequência de mudanças e acoplamento"
            )

        return ". ".join(reasons) + "."

    def _generate_recommendations(self, module_data: dict[str, Any]) -> list[str]:
        """Generate recommendations for understanding this module."""
        recommendations = []

        complexity = module_data["metrics"]["complexity"]
        coupling = module_data["metrics"]["coupling"]
        module_name = module_data["module_name"]
        path_lower = module_name.lower()

        if any(kw in path_lower for kw in ["controller", "router", "routes", "handler"]):
            recommendations.append(
                "Comece pelos métodos públicos do controller — eles expõem a API do módulo"
            )
        elif any(kw in path_lower for kw in ["service", "services"]):
            recommendations.append(
                "Identifique os métodos públicos do serviço e as interfaces que ele implementa"
            )
        elif any(kw in path_lower for kw in ["module", "modules"]):
            recommendations.append(
                "Leia o arquivo de módulo principal para entender quais providers e imports são registrados"
            )
        else:
            recommendations.append(
                "Localize o arquivo de entrada principal (index, main ou __init__) e leia os exports"
            )

        avg_cc = complexity.get("avg_complexity", 0)
        if avg_cc > 7:
            recommendations.append(
                "As funções com maior complexidade ciclomática merecem atenção especial — "
                "mapeie todos os caminhos de execução possíveis"
            )
        elif avg_cc > 4:
            recommendations.append(
                "Trace os fluxos condicionais principais para entender quando cada comportamento é ativado"
            )

        dep_list = coupling.get("dependency_list", [])
        unique_deps = coupling.get("unique_dependencies", 0)
        if unique_deps > 3 and dep_list:
            dep_sample = ", ".join(f"`{d}`" for d in dep_list[:3])
            recommendations.append(
                f"Entenda primeiro as dependências-chave: {dep_sample} — "
                f"elas fornecem o contexto necessário para este módulo"
            )

        recommendations.append(
            "Procure os arquivos de teste associados (.spec, .test ou pasta __tests__) — "
            "eles documentam os comportamentos esperados com exemplos concretos"
        )

        return recommendations
