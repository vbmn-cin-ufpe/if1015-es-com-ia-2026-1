"""Language registry — single source of truth for multi-language support.

Each LanguageSpec describes everything the rest of the system needs to know
about a source language without scattering that knowledge across services.

Design principles applied:
  - OCP: add new languages by registering a new LanguageSpec, zero other changes.
  - SRP: this module only knows *what* languages exist, not *how* to use them.
  - DRY: glob patterns, display names and tree-sitter grammar lives here once.
  - YAGNI: only the data actually consumed by existing services is stored here.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# tree-sitter query fragments: node types that count as a "branch point"
# for cyclomatic complexity. One entry per language.
# ---------------------------------------------------------------------------
_BRANCH_NODE_TYPES: dict[str, list[str]] = {
    "python": [
        "if_statement", "elif_clause", "for_statement", "while_statement",
        "except_clause", "with_statement", "conditional_expression",
        "boolean_operator",
    ],
    "javascript": [
        "if_statement", "else_clause", "for_statement", "for_in_statement",
        "while_statement", "do_statement", "switch_case", "catch_clause",
        "conditional_expression", "logical_expression",
    ],
    "typescript": [
        "if_statement", "else_clause", "for_statement", "for_in_statement",
        "while_statement", "do_statement", "switch_case", "catch_clause",
        "conditional_expression", "logical_expression",
    ],
    "java": [
        "if_statement", "else", "for_statement", "enhanced_for_statement",
        "while_statement", "do_statement", "switch_expression",
        "catch_clause", "conditional_expression", "binary_expression",
    ],
    "go": [
        "if_statement", "else", "for_statement", "range_clause",
        "switch_statement", "type_switch_statement", "select_statement",
        "case_clause",
    ],
    "rust": [
        "if_expression", "else_clause", "for_expression", "while_expression",
        "loop_expression", "match_expression", "match_arm",
        "if_let_expression", "while_let_expression",
    ],
    "c": [
        "if_statement", "for_statement", "while_statement", "do_statement",
        "switch_statement", "case_statement", "conditional_expression",
    ],
    "cpp": [
        "if_statement", "for_statement", "while_statement", "do_statement",
        "switch_statement", "case_statement", "conditional_expression",
        "try_statement", "catch_clause",
    ],
    "csharp": [
        "if_statement", "for_statement", "foreach_statement", "while_statement",
        "do_statement", "switch_section", "catch_clause", "conditional_expression",
        "when_clause",
    ],
    "ruby": [
        "if", "elsif", "unless", "while", "until", "for", "case", "when",
        "rescue", "conditional", "unless_modifier", "until_modifier",
    ],
    "php": [
        "if_statement", "elseif_clause", "for_statement", "foreach_statement",
        "while_statement", "do_statement", "switch_statement", "case_statement",
        "catch_clause", "conditional_expression", "match_expression",
    ],
    "kotlin": [
        "if_expression", "when_expression", "when_entry", "for_statement",
        "while_statement", "do_while_statement", "catch",
    ],
    "swift": [
        "if_statement", "guard_statement", "for_in_statement", "while_statement",
        "repeat_while_statement", "switch_statement", "catch_clause",
    ],
    "scala": [
        "if_expression", "match_expression", "case_clause", "for_expression",
        "while_expression", "try_expression", "catch_clause",
    ],
    "bash": [
        "if_statement", "elif_clause", "while_statement", "for_statement",
        "case_statement", "case_item",
    ],
}

# ---------------------------------------------------------------------------
# tree-sitter query fragments: node types that represent "import" statements
# ---------------------------------------------------------------------------
_IMPORT_NODE_TYPES: dict[str, list[str]] = {
    "python":     ["import_statement", "import_from_statement"],
    "javascript": ["import_statement", "call_expression"],   # require()
    "typescript": ["import_statement", "import_require_clause"],
    "java":       ["import_declaration"],
    "go":         ["import_spec"],
    "rust":       ["use_declaration"],
    "c":          ["preproc_include"],
    "cpp":        ["preproc_include", "using_declaration", "using_directive"],
    "csharp":     ["using_directive"],
    "ruby":       ["call"],   # require / require_relative
    "php":        ["require_expression", "require_once_expression",
                   "include_expression", "include_once_expression"],
    "kotlin":     ["import_header"],
    "swift":      ["import_declaration"],
    "scala":      ["import_declaration"],
    "bash":       ["command"],   # source / .
}


@dataclass(frozen=True)
class LanguageSpec:
    """Immutable descriptor for a single source language."""

    name: str               # canonical key, e.g. "python"
    display_name: str       # e.g. "Python"
    extensions: tuple[str, ...]   # e.g. (".py",)
    ts_module: str          # importable tree-sitter grammar package name
    branch_node_types: tuple[str, ...]  # node types that add 1 to complexity
    import_node_types: tuple[str, ...]  # node types that represent imports
    comment_prefixes: tuple[str, ...]   # for line-comment detection fallback

    @property
    def glob_patterns(self) -> list[str]:
        return [f"*{ext}" for ext in self.extensions]

    def matches_file(self, path: Path) -> bool:
        return path.suffix.lower() in self.extensions


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

_REGISTRY: dict[str, LanguageSpec] = {}


def _register(spec: LanguageSpec) -> None:
    _REGISTRY[spec.name] = spec


_register(LanguageSpec(
    name="python",
    display_name="Python",
    extensions=(".py",),
    ts_module="tree_sitter_python",
    branch_node_types=tuple(_BRANCH_NODE_TYPES["python"]),
    import_node_types=tuple(_IMPORT_NODE_TYPES["python"]),
    comment_prefixes=("#",),
))

_register(LanguageSpec(
    name="javascript",
    display_name="JavaScript",
    extensions=(".js", ".mjs", ".cjs"),
    ts_module="tree_sitter_javascript",
    branch_node_types=tuple(_BRANCH_NODE_TYPES["javascript"]),
    import_node_types=tuple(_IMPORT_NODE_TYPES["javascript"]),
    comment_prefixes=("//", "/*"),
))

_register(LanguageSpec(
    name="typescript",
    display_name="TypeScript",
    extensions=(".ts", ".tsx"),
    ts_module="tree_sitter_typescript",
    branch_node_types=tuple(_BRANCH_NODE_TYPES["typescript"]),
    import_node_types=tuple(_IMPORT_NODE_TYPES["typescript"]),
    comment_prefixes=("//", "/*"),
))

_register(LanguageSpec(
    name="java",
    display_name="Java",
    extensions=(".java",),
    ts_module="tree_sitter_java",
    branch_node_types=tuple(_BRANCH_NODE_TYPES["java"]),
    import_node_types=tuple(_IMPORT_NODE_TYPES["java"]),
    comment_prefixes=("//", "/*"),
))

_register(LanguageSpec(
    name="go",
    display_name="Go",
    extensions=(".go",),
    ts_module="tree_sitter_go",
    branch_node_types=tuple(_BRANCH_NODE_TYPES["go"]),
    import_node_types=tuple(_IMPORT_NODE_TYPES["go"]),
    comment_prefixes=("//", "/*"),
))

_register(LanguageSpec(
    name="rust",
    display_name="Rust",
    extensions=(".rs",),
    ts_module="tree_sitter_rust",
    branch_node_types=tuple(_BRANCH_NODE_TYPES["rust"]),
    import_node_types=tuple(_IMPORT_NODE_TYPES["rust"]),
    comment_prefixes=("//", "/*"),
))

# ── Tier 2: additional commercial languages ──────────────────────────────────

_register(LanguageSpec(
    name="c",
    display_name="C",
    extensions=(".c", ".h"),
    ts_module="tree_sitter_c",
    branch_node_types=tuple(_BRANCH_NODE_TYPES["c"]),
    import_node_types=tuple(_IMPORT_NODE_TYPES["c"]),
    comment_prefixes=("//", "/*"),
))

_register(LanguageSpec(
    name="cpp",
    display_name="C++",
    extensions=(".cpp", ".cc", ".cxx", ".hpp", ".hxx", ".h++"),
    ts_module="tree_sitter_cpp",
    branch_node_types=tuple(_BRANCH_NODE_TYPES["cpp"]),
    import_node_types=tuple(_IMPORT_NODE_TYPES["cpp"]),
    comment_prefixes=("//", "/*"),
))

_register(LanguageSpec(
    name="csharp",
    display_name="C#",
    extensions=(".cs",),
    ts_module="tree_sitter_c_sharp",
    branch_node_types=tuple(_BRANCH_NODE_TYPES["csharp"]),
    import_node_types=tuple(_IMPORT_NODE_TYPES["csharp"]),
    comment_prefixes=("//", "/*"),
))

_register(LanguageSpec(
    name="ruby",
    display_name="Ruby",
    extensions=(".rb", ".rake", ".gemspec"),
    ts_module="tree_sitter_ruby",
    branch_node_types=tuple(_BRANCH_NODE_TYPES["ruby"]),
    import_node_types=tuple(_IMPORT_NODE_TYPES["ruby"]),
    comment_prefixes=("#",),
))

_register(LanguageSpec(
    name="php",
    display_name="PHP",
    extensions=(".php", ".php3", ".php4", ".php5", ".phtml"),
    ts_module="tree_sitter_php",
    branch_node_types=tuple(_BRANCH_NODE_TYPES["php"]),
    import_node_types=tuple(_IMPORT_NODE_TYPES["php"]),
    comment_prefixes=("//", "#", "/*"),
))

_register(LanguageSpec(
    name="kotlin",
    display_name="Kotlin",
    extensions=(".kt", ".kts"),
    ts_module="tree_sitter_kotlin",
    branch_node_types=tuple(_BRANCH_NODE_TYPES["kotlin"]),
    import_node_types=tuple(_IMPORT_NODE_TYPES["kotlin"]),
    comment_prefixes=("//", "/*"),
))

_register(LanguageSpec(
    name="swift",
    display_name="Swift",
    extensions=(".swift",),
    ts_module="tree_sitter_swift",
    branch_node_types=tuple(_BRANCH_NODE_TYPES["swift"]),
    import_node_types=tuple(_IMPORT_NODE_TYPES["swift"]),
    comment_prefixes=("//", "/*"),
))

_register(LanguageSpec(
    name="scala",
    display_name="Scala",
    extensions=(".scala", ".sc"),
    ts_module="tree_sitter_scala",
    branch_node_types=tuple(_BRANCH_NODE_TYPES["scala"]),
    import_node_types=tuple(_IMPORT_NODE_TYPES["scala"]),
    comment_prefixes=("//", "/*"),
))

_register(LanguageSpec(
    name="bash",
    display_name="Shell/Bash",
    extensions=(".sh", ".bash", ".zsh", ".ksh"),
    ts_module="tree_sitter_bash",
    branch_node_types=tuple(_BRANCH_NODE_TYPES["bash"]),
    import_node_types=tuple(_IMPORT_NODE_TYPES["bash"]),
    comment_prefixes=("#",),
))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def all_languages() -> list[LanguageSpec]:
    """Return all registered language specs."""
    return list(_REGISTRY.values())


def get_language(name: str) -> LanguageSpec | None:
    """Return spec by canonical name, or None."""
    return _REGISTRY.get(name)


def detect_language(path: Path) -> LanguageSpec | None:
    """Detect language from file extension."""
    ext = path.suffix.lower()
    for spec in _REGISTRY.values():
        if ext in spec.extensions:
            return spec
    return None


def detect_repo_languages(repo_root: Path) -> dict[str, int]:
    """Scan a repository and count files per language.

    Returns a dict {language_name: file_count} sorted by count desc.
    """
    excluded = {".git", "node_modules", "venv", ".venv", "__pycache__", "dist", "build", "vendor"}
    counts: dict[str, int] = {}

    for f in repo_root.rglob("*"):
        if not f.is_file():
            continue
        if any(part in excluded for part in f.parts):
            continue
        spec = detect_language(f)
        if spec:
            counts[spec.name] = counts.get(spec.name, 0) + 1

    return dict(sorted(counts.items(), key=lambda kv: kv[1], reverse=True))


# ---------------------------------------------------------------------------
# tree-sitter parser cache — lazy-load grammars on first use
# ---------------------------------------------------------------------------

@lru_cache(maxsize=None)
def _get_ts_language(lang_name: str) -> Any | None:
    """Load and cache a tree-sitter Language object."""
    spec = get_language(lang_name)
    if spec is None:
        return None
    try:
        import importlib
        from tree_sitter import Language as TSLanguage

        module = importlib.import_module(spec.ts_module)
        # tree-sitter-* packages expose a `language()` function
        return TSLanguage(module.language())
    except Exception as exc:
        logger.warning("tree-sitter grammar unavailable for %s: %s", lang_name, exc)
        return None


def parse_file(path: Path) -> tuple[Any, str] | None:
    """Parse a source file with tree-sitter.

    Returns (tree, lang_name) or None if language/grammar unavailable.
    """
    spec = detect_language(path)
    if spec is None:
        return None

    ts_lang = _get_ts_language(spec.name)
    if ts_lang is None:
        return None

    try:
        from tree_sitter import Parser
        parser = Parser(ts_lang)
        content = path.read_bytes()
        return parser.parse(content), spec.name
    except Exception as exc:
        logger.debug("Could not parse %s: %s", path, exc)
        return None


def count_branch_nodes(tree: Any, lang_name: str) -> int:
    """Walk a tree-sitter tree and count branch/decision nodes."""
    spec = get_language(lang_name)
    if spec is None:
        return 0

    branch_types = set(spec.branch_node_types)
    count = 0

    def _walk(node: Any) -> None:
        nonlocal count
        if node.type in branch_types:
            count += 1
        for child in node.children:
            _walk(child)

    _walk(tree.root_node)
    return count
