"""
Repository Scanner — Python port of ezscan's scanner.ts

Walks a cloned repository, extracts:
  • file / function / class / module / database / service nodes
  • imports / calls / extends / contains / references / calls_api / serves_api / queries / depends_on edges

Output is formatted for Cytoscape.js:
  {
    "nodes": [ {"data": {"id", "label", "type", "language", ...}} ],
    "edges": [ {"data": {"id", "source", "target", "type", "label"}} ]
  }
"""

from __future__ import annotations

import os
import re
import subprocess
import logging
from pathlib import Path
from typing import Any
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
#  Constants
# ---------------------------------------------------------------------------

EXTENSION_LANGUAGE_MAP: dict[str, str] = {
    ".ts": "typescript",
    ".js": "javascript",
    ".tsx": "typescript",
    ".jsx": "javascript",
    ".py": "python",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".r": "r",
    ".R": "r",
    ".cpp": "cpp",
    ".c": "c",
    ".cs": "csharp",
}

IMPORT_PATTERNS: dict[str, re.Pattern] = {
    "typescript": re.compile(
        r"""(?:import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*\(\s*['"]([^'"]+)['"]\s*\))""",
    ),
    "javascript": re.compile(
        r"""(?:import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*\(\s*['"]([^'"]+)['"]\s*\))""",
    ),
    "python": re.compile(r"(?:import\s+([^\s,]+)|from\s+([^\s,]+)\s+import)"),
    "java": re.compile(r"import\s+([\w.*]+)\s*;"),
    "go": re.compile(r"""import\s*(?:\(\s*([\s\S]*?)\s*\)|['"]([^'"]+)['"])"""),
    "rust": re.compile(r"(?:use\s+([^;]+)|mod\s+([^;]+)|extern\s+crate\s+([^;]+))"),
    "r": re.compile(r"""(?:library\s*\(\s*[\"']?([^\"'\s]+)[\"']?\s*\)|require\s*\(\s*[\"']?([^\"'\s]+)[\"']?\s*\))"""),
}

FUNC_CLASS_PATTERNS: dict[str, dict[str, re.Pattern]] = {
    "typescript": {
        "func": re.compile(r"(?:function\s+(\w+)|(\w+)\s*\([^)]*\)\s*[=>{])"),
        "class": re.compile(r"class\s+(\w+)"),
    },
    "javascript": {
        "func": re.compile(r"(?:function\s+(\w+)|(\w+)\s*=\s*\([^)]*\)\s*=>)"),
        "class": re.compile(r"class\s+(\w+)"),
    },
    "python": {
        "func": re.compile(r"def\s+(\w+)\s*\("),
        "class": re.compile(r"class\s+(\w+)\s*[(:]+"),
    },
    "java": {
        "func": re.compile(r"(?:public|private|protected)?\s*(?:static\s+)?[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)\s*\{"),
        "class": re.compile(r"class\s+(\w+)"),
    },
    "go": {
        "func": re.compile(r"func\s+(?:\([^)]*\)\s*)?(\w+)\s*\("),
        "class": re.compile(r"type\s+(\w+)\s+struct"),
    },
    "rust": {
        "func": re.compile(r"fn\s+(\w+)"),
        "class": re.compile(r"(?:struct|enum)\s+(\w+)"),
    },
    "r": {
        "func": re.compile(r"(\w+)\s*<-\s*function"),
        "class": re.compile(r'(\w+)\s*<-.*?structure|setClass\s*\(\s*["\'](\w+)["\']'),
    },
}

INHERITANCE_PATTERNS: dict[str, re.Pattern] = {
    "typescript": re.compile(r"class\s+(\w+)\s+extends\s+(\w+)"),
    "javascript": re.compile(r"class\s+(\w+)\s+extends\s+(\w+)"),
    "java": re.compile(r"class\s+(\w+)\s+extends\s+(\w+)"),
    "python": re.compile(r"class\s+(\w+)\s*\((\w+)\)"),
}

HTTP_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"}

SKIP_DIRS = {
    "node_modules", ".git", "target", "dist", "build", "out",
    ".vscode", ".next", ".turbo", ".cache", "__pycache__",
    "venv", ".venv", "env", ".env", ".idea",
}
SKIP_FILES = {"package-lock.json", "yarn.lock", "Cargo.lock"}

MAX_FILE_SIZE = 1024 * 1024  # 1 MB

CALL_IGNORE = {"if", "for", "while", "switch", "catch", "return", "new", "typeof", "print", "self", "len", "range", "type", "str", "int", "float", "list", "dict", "set", "tuple", "super"}


# ---------------------------------------------------------------------------
#  RepoScanner
# ---------------------------------------------------------------------------

class RepoScanner:
    """Scans a repository directory and builds a graph of code relationships."""

    def __init__(self, root_path: str, *, include_change_tracking: bool = False):
        self.root_path = os.path.abspath(root_path)
        self.include_change_tracking = include_change_tracking

        self._nodes: list[dict[str, Any]] = []
        self._edges: list[dict[str, Any]] = []
        self._node_ids: set[str] = set()
        self._edge_ids: set[str] = set()

        self._file_node_by_path: dict[str, str] = {}
        self._file_paths_by_basename: dict[str, list[str]] = {}
        self._symbols_by_file_id: dict[str, dict[str, str]] = {}

        # Pending resolution lists
        self._pending_imports: list[dict] = []
        self._pending_api_consumers: list[dict] = []
        self._pending_db_usages: list[dict] = []
        self._pending_inheritance: list[dict] = []

        self._api_endpoint_nodes: dict[str, str] = {}
        self._api_providers: dict[str, set[str]] = {}
        self._api_consumers: dict[str, set[str]] = {}
        self._db_node_by_entity: dict[str, str] = {}

        self._changed_files: set[str] = set()
        self._changed_status: dict[str, str] = {}

    # ---- public API -------------------------------------------------------

    def scan(self) -> dict[str, Any]:
        """Full scan → returns Cytoscape.js formatted graph."""
        files = self._collect_files()

        if self.include_change_tracking:
            self._detect_changed_files()

        # Process files (with threading for speed)
        self._process_files(files)

        # Second-pass analysis
        self._analyze_imports()
        self._analyze_api_dependencies()
        self._analyze_database_dependencies()
        self._analyze_inheritance()

        return self._to_cytoscape()

    # ---- Graph response formatter -----------------------------------------------

    def _to_cytoscape(self) -> dict[str, Any]:
        """Convert internal nodes/edges to standard D3 elements format."""
        
        # We output self._nodes and self._edges directly because they exactly match
        # what the ezscan d3 implementation natively expects (id, name, type, metadata)
        return {
            "nodes": self._nodes,
            "edges": self._edges,
            "stats": {
                "total_nodes": len(self._nodes),
                "total_edges": len(self._edges),
                "files": sum(1 for n in self._nodes if n["type"] == "file"),
                "functions": sum(1 for n in self._nodes if n["type"] == "function"),
                "classes": sum(1 for n in self._nodes if n["type"] == "class"),
                "modules": sum(1 for n in self._nodes if n["type"] == "module"),
                "services": sum(1 for n in self._nodes if n["type"] == "service"),
                "databases": sum(1 for n in self._nodes if n["type"] == "database"),
                "changed_files": sum(1 for n in self._nodes if n.get("metadata", {}).get("changed")),
            },
        }

    # ---- File collection ---------------------------------------------------

    def _collect_files(self) -> list[dict[str, str]]:
        files: list[dict[str, str]] = []
        for dirpath, dirnames, filenames in os.walk(self.root_path):
            # Prune skip dirs in-place
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]

            for fname in filenames:
                if fname in SKIP_FILES:
                    continue
                ext = os.path.splitext(fname)[1]
                if ext not in EXTENSION_LANGUAGE_MAP:
                    continue
                full = os.path.join(dirpath, fname)
                rel = os.path.relpath(full, self.root_path).replace("\\", "/")
                files.append({"full": full, "rel": rel})
        return files

    # ---- File processing ---------------------------------------------------

    def _process_files(self, files: list[dict[str, str]]) -> None:
        if not files:
            return

        def _process_one(f: dict[str, str]) -> None:
            self._process_file(f["full"], f["rel"])

        # Use threads for I/O-bound file reading
        with ThreadPoolExecutor(max_workers=min(16, len(files))) as pool:
            # Since we mutate shared state, process sequentially for safety
            # The thread pool is mainly for potential future async I/O
            for f in files:
                _process_one(f)

    def _process_file(self, full_path: str, rel_path: str) -> None:
        ext = os.path.splitext(full_path)[1]
        language = EXTENSION_LANGUAGE_MAP.get(ext)
        if not language:
            return

        try:
            size = os.path.getsize(full_path)
        except OSError:
            return

        if size > MAX_FILE_SIZE:
            return

        try:
            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except (OSError, UnicodeDecodeError):
            return

        if "\x00" in content:
            return

        node_id = self._create_node_id(rel_path)
        file_changed = rel_path in self._changed_files if self.include_change_tracking else False
        git_status = self._changed_status.get(rel_path) if self.include_change_tracking else None

        self._add_node({
            "id": node_id,
            "type": "file",
            "name": os.path.basename(full_path),
            "path": rel_path,
            "language": language,
            "metadata": {
                "size": size,
                "lines": content.count("\n") + 1,
                "changed": file_changed,
                "gitStatus": git_status,
            },
        })

        self._file_node_by_path[rel_path] = node_id
        self._index_file_by_basename(rel_path)

        self._extract_functions_and_classes(content, language, node_id, rel_path, file_changed, git_status)
        self._collect_symbol_references(content, node_id)
        self._collect_inheritance(content, node_id, rel_path, language)
        self._collect_imports(content, language, node_id, rel_path)
        self._collect_api_surface(content, node_id, rel_path)
        self._collect_database_usage(content, node_id)
        self._collect_cross_language_bridges(content, language, node_id)

    # ---- Extraction helpers ------------------------------------------------

    def _extract_functions_and_classes(
        self, content: str, language: str, file_id: str,
        rel_path: str, is_changed: bool, git_status: str | None,
    ) -> None:
        patterns = FUNC_CLASS_PATTERNS.get(language)
        if not patterns:
            return

        symbol_index = self._symbols_by_file_id.setdefault(file_id, {})

        for m in patterns["func"].finditer(content):
            name = m.group(1) or (m.group(2) if m.lastindex and m.lastindex >= 2 else None)
            if name and len(name) > 2:
                func_id = f"{file_id}::{name}"
                self._add_node({
                    "id": func_id,
                    "type": "function",
                    "name": name,
                    "path": rel_path,
                    "language": language,
                    "metadata": {"changed": is_changed, "gitStatus": git_status},
                })
                self._add_edge({"source": file_id, "target": func_id, "type": "contains"})
                symbol_index[name] = func_id

        for m in patterns["class"].finditer(content):
            name = m.group(1) or (m.group(2) if m.lastindex and m.lastindex >= 2 else None)
            if name and len(name) > 2:
                class_id = f"{file_id}::{name}"
                self._add_node({
                    "id": class_id,
                    "type": "class",
                    "name": name,
                    "path": rel_path,
                    "language": language,
                    "metadata": {"changed": is_changed, "gitStatus": git_status},
                })
                self._add_edge({"source": file_id, "target": class_id, "type": "contains"})
                symbol_index[name] = class_id

    def _collect_symbol_references(self, content: str, file_id: str) -> None:
        symbols = self._symbols_by_file_id.get(file_id)
        if not symbols:
            return

        call_re = re.compile(r"\b([A-Za-z_]\w*)\s*\(")
        for m in call_re.finditer(content):
            token = m.group(1)
            if token in CALL_IGNORE:
                continue
            target_id = symbols.get(token)
            if target_id:
                self._add_edge({
                    "source": file_id,
                    "target": target_id,
                    "type": "references",
                    "label": f"symbol:{token}",
                })

    def _collect_inheritance(self, content: str, file_id: str, rel_path: str, language: str) -> None:
        pattern = INHERITANCE_PATTERNS.get(language)
        if not pattern:
            return
        for m in pattern.finditer(content):
            source_name = m.group(1)
            base_name = m.group(2)
            if source_name and base_name:
                self._pending_inheritance.append({
                    "source_class_id": f"{file_id}::{source_name}",
                    "source_path": rel_path,
                    "base_class_name": base_name,
                })

    def _collect_imports(self, content: str, language: str, source_id: str, source_path: str) -> None:
        pattern = IMPORT_PATTERNS.get(language)
        if not pattern:
            return

        if language == "go":
            self._collect_go_imports(content, source_id, source_path, pattern)
            return

        for m in pattern.finditer(content):
            import_path = None
            for g in range(1, m.lastindex + 1 if m.lastindex else 1):
                if m.group(g):
                    import_path = m.group(g).strip()
                    break
            if not import_path:
                continue
            self._pending_imports.append({
                "source_id": source_id,
                "source_path": source_path,
                "import_path": import_path,
                "is_relative": import_path.startswith(".") or import_path.startswith("/"),
            })

    def _collect_go_imports(self, content: str, source_id: str, source_path: str, pattern: re.Pattern) -> None:
        for m in pattern.finditer(content):
            if m.group(1):
                # Multi-import block
                quoted = re.findall(r'["\']([^"\']+)["\']', m.group(1))
                for val in quoted:
                    self._pending_imports.append({
                        "source_id": source_id,
                        "source_path": source_path,
                        "import_path": val,
                        "is_relative": val.startswith(".") or val.startswith("/"),
                    })
            if m.group(2):
                val = m.group(2).strip()
                self._pending_imports.append({
                    "source_id": source_id,
                    "source_path": source_path,
                    "import_path": val,
                    "is_relative": val.startswith(".") or val.startswith("/"),
                })

    def _collect_api_surface(self, content: str, source_id: str, source_path: str) -> None:
        # --- Providers (route definitions) ---
        provider_patterns = [
            re.compile(r"""(?:app|router)\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]""", re.I),
            re.compile(r"""@(?:app|router)\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]""", re.I),
        ]
        for pat in provider_patterns:
            for m in pat.finditer(content):
                method = self._normalize_http_method(m.group(1))
                route = self._normalize_route(m.group(2))
                if not route:
                    continue
                endpoint_id = self._get_or_create_api_endpoint(method, route)
                self._add_edge({
                    "source": source_id,
                    "target": endpoint_id,
                    "type": "serves_api",
                    "label": f"{method} {route}",
                })
                self._api_providers.setdefault(endpoint_id, set()).add(source_id)

        # --- Consumers (API calls) ---
        consumer_patterns = [
            (re.compile(r"""fetch\s*\(\s*['"`]([^'"`]+)['"`]""", re.I), None),
            (re.compile(r"""axios\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]""", re.I), None),
            (re.compile(r"""requests\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]""", re.I), None),
        ]
        for pat, default_method in consumer_patterns:
            for m in pat.finditer(content):
                if m.lastindex and m.lastindex >= 2:
                    method = self._normalize_http_method(m.group(1))
                    url = m.group(2)
                else:
                    method = self._normalize_http_method(default_method or "GET")
                    url = m.group(1)
                route = self._extract_route_from_url(url, source_path)
                if not route:
                    continue
                self._pending_api_consumers.append({
                    "source_id": source_id,
                    "source_path": source_path,
                    "method": method,
                    "route": route,
                })

    def _collect_database_usage(self, content: str, source_id: str) -> None:
        entities: set[str] = set()

        # SQL patterns
        for m in re.finditer(r"\b(?:from|join|into|update|table)\s+[`\"\[]?([a-zA-Z_]\w*)", content, re.I):
            entity = self._normalize_entity(m.group(1))
            if entity:
                entities.add(entity)

        # MongoDB: collection('name')
        for m in re.finditer(r"""collection\s*\(\s*['"`]([a-zA-Z_][\w-]*)['"`]\s*\)""", content, re.I):
            entity = self._normalize_entity(m.group(1))
            if entity:
                entities.add(entity)

        # Prisma: prisma.modelName.
        for m in re.finditer(r"prisma\.([a-zA-Z_]\w*)\.", content):
            entity = self._normalize_entity(m.group(1))
            if entity:
                entities.add(entity)

        if entities:
            self._pending_db_usages.append({
                "source_id": source_id,
                "entities": list(entities),
            })

    def _collect_cross_language_bridges(self, content: str, language: str, source_id: str) -> None:
        if language == "r":
            # extendr .Call(wrap__xxx)
            for m in re.finditer(r"\.Call\(\s*wrap__(\w+)", content):
                bridge_id = f"bridge::extendr::{m.group(1)}"
                self._add_node({
                    "id": bridge_id, "type": "service",
                    "name": f"R-Rust Bridge: {m.group(1)}",
                    "path": f"extendr://{m.group(1)}",
                })
                self._add_edge({"source": source_id, "target": bridge_id, "type": "depends_on", "label": "extendr_call"})
            # Generic Rcpp .Call("xxx")
            for m in re.finditer(r"""\.Call\(\s*['"](\w+)['"]""", content):
                bridge_id = f"bridge::cpp::{m.group(1)}"
                self._add_node({
                    "id": bridge_id, "type": "service",
                    "name": f"R-C++ Bridge: {m.group(1)}",
                    "path": f"cpp://{m.group(1)}",
                })
                self._add_edge({"source": source_id, "target": bridge_id, "type": "depends_on", "label": "rcpp_call"})

        elif language == "rust":
            if "use extendr_api::prelude::*" in content or "#[extendr]" in content:
                for m in re.finditer(r"#\[extendr\]\s*fn\s+(\w+)", content):
                    bridge_id = f"bridge::extendr::{m.group(1)}"
                    self._add_node({
                        "id": bridge_id, "type": "service",
                        "name": f"R-Rust Bridge: {m.group(1)}",
                        "path": f"extendr://{m.group(1)}",
                    })
                    self._add_edge({"source": bridge_id, "target": source_id, "type": "depends_on", "label": "extendr_export"})
                    func_id = f"{source_id}::{m.group(1)}"
                    self._add_edge({"source": bridge_id, "target": func_id, "type": "calls"})

        elif language in ("cpp", "c"):
            for m in re.finditer(r"//\s*\[\[Rcpp::export\]\]\s*(?:[\w<>:]+\s+)+(\w+)\s*\(", content):
                bridge_id = f"bridge::cpp::{m.group(1)}"
                self._add_node({
                    "id": bridge_id, "type": "service",
                    "name": f"R-C++ Bridge: {m.group(1)}",
                    "path": f"cpp://{m.group(1)}",
                })
                self._add_edge({"source": bridge_id, "target": source_id, "type": "depends_on", "label": "rcpp_export"})
                func_id = f"{source_id}::{m.group(1)}"
                self._add_edge({"source": bridge_id, "target": func_id, "type": "calls"})

    # ---- Second-pass analysis ----------------------------------------------

    def _analyze_imports(self) -> None:
        for imp in self._pending_imports:
            if imp["is_relative"]:
                target_id = self._resolve_relative_import(imp["source_path"], imp["import_path"])
            else:
                target_id = self._resolve_module_import(imp["import_path"])

            final_id = target_id or self._create_module_node(imp["import_path"])

            self._add_edge({
                "source": imp["source_id"],
                "target": final_id,
                "type": "imports",
                "label": imp["import_path"],
            })
            if target_id:
                self._add_edge({
                    "source": imp["source_id"],
                    "target": target_id,
                    "type": "depends_on",
                    "label": "module_link",
                })

    def _analyze_api_dependencies(self) -> None:
        for pending in self._pending_api_consumers:
            endpoint_id = self._get_or_create_api_endpoint(pending["method"], pending["route"])
            self._add_edge({
                "source": pending["source_id"],
                "target": endpoint_id,
                "type": "calls_api",
                "label": f"{pending['method']} {pending['route']}",
            })
            self._api_consumers.setdefault(endpoint_id, set()).add(pending["source_id"])

        # Link consumers → providers
        for endpoint_id, consumers in self._api_consumers.items():
            providers = self._api_providers.get(endpoint_id)
            if not providers:
                continue
            for consumer_id in consumers:
                for provider_id in providers:
                    if consumer_id != provider_id:
                        self._add_edge({
                            "source": consumer_id,
                            "target": provider_id,
                            "type": "depends_on",
                            "label": f"api:{endpoint_id}",
                        })

    def _analyze_database_dependencies(self) -> None:
        for usage in self._pending_db_usages:
            for entity in usage["entities"]:
                db_id = self._get_or_create_db_node(entity)
                self._add_edge({
                    "source": usage["source_id"],
                    "target": db_id,
                    "type": "queries",
                    "label": entity,
                })

    def _analyze_inheritance(self) -> None:
        for pending in self._pending_inheritance:
            # Try local resolution first
            parts = pending["source_class_id"].rsplit("::", 1)
            local_base = f"{parts[0]}::{pending['base_class_name']}" if len(parts) > 1 else pending["base_class_name"]
            target_id = local_base if local_base in self._node_ids else None

            if not target_id:
                target_id = (
                    self._resolve_module_import(pending["base_class_name"])
                    or self._create_module_node(pending["base_class_name"])
                )

            self._add_edge({
                "source": pending["source_class_id"],
                "target": target_id,
                "type": "extends",
                "label": pending["base_class_name"],
            })

    # ---- Import resolution -------------------------------------------------

    def _resolve_relative_import(self, source_path: str, import_path: str) -> str | None:
        base_dir = os.path.dirname(source_path).replace("\\", "/")
        joined = os.path.normpath(os.path.join(base_dir, import_path)).replace("\\", "/")
        candidates = [joined]
        for ext in EXTENSION_LANGUAGE_MAP:
            candidates.append(f"{joined}{ext}")
            candidates.append(f"{joined}/index{ext}")
        for c in candidates:
            hit = self._file_node_by_path.get(c)
            if hit:
                return hit
        return None

    def _resolve_module_import(self, module_path: str) -> str | None:
        clean = module_path.lstrip("@").split("/")[-1] if "/" in module_path else module_path.lstrip("@")
        candidates = self._file_paths_by_basename.get(clean)
        if not candidates:
            return None
        return self._file_node_by_path.get(candidates[0])

    def _create_module_node(self, module_name: str) -> str:
        normalized = module_name.strip()
        node_id = f"module::{self._sanitize_token(normalized)}"
        self._add_node({
            "id": node_id,
            "type": "module",
            "name": normalized,
            "path": normalized,
            "metadata": {"external": True},
        })
        return node_id

    # ---- Helpers -----------------------------------------------------------

    def _get_or_create_api_endpoint(self, method: str, route: str) -> str:
        key = f"{method} {route}"
        existing = self._api_endpoint_nodes.get(key)
        if existing:
            return existing
        node_id = f"service::{method.lower()}::{self._sanitize_token(route)}"
        self._add_node({
            "id": node_id,
            "type": "service",
            "name": key,
            "path": route,
            "metadata": {"method": method},
        })
        self._api_endpoint_nodes[key] = node_id
        return node_id

    def _get_or_create_db_node(self, entity: str) -> str:
        key = entity.lower()
        existing = self._db_node_by_entity.get(key)
        if existing:
            return existing
        node_id = f"db::entity::{self._sanitize_token(entity)}"
        self._add_node({
            "id": node_id,
            "type": "database",
            "name": entity,
            "path": entity,
        })
        self._db_node_by_entity[key] = node_id
        return node_id

    def _add_node(self, node: dict[str, Any]) -> None:
        if node["id"] in self._node_ids:
            return
        self._node_ids.add(node["id"])
        self._nodes.append(node)

    def _add_edge(self, edge: dict[str, Any]) -> None:
        key = f"{edge['source']}|{edge['target']}|{edge['type']}|{edge.get('label', '')}"
        if key in self._edge_ids:
            return
        self._edge_ids.add(key)
        self._edges.append(edge)

    def _index_file_by_basename(self, rel_path: str) -> None:
        base = os.path.splitext(os.path.basename(rel_path))[0]
        self._file_paths_by_basename.setdefault(base, []).append(rel_path)

    @staticmethod
    def _create_node_id(rel_path: str) -> str:
        return re.sub(r"[/\\]", "::", re.sub(r"\.[^.]+$", "", rel_path))

    @staticmethod
    def _sanitize_token(value: str) -> str:
        result = re.sub(r"https?://", "", value.lower())
        result = re.sub(r"[^a-z0-9/_-]", "_", result)
        result = re.sub(r"_+", "_", result)
        return result.strip("_")

    @staticmethod
    def _normalize_http_method(value: str | None) -> str:
        method = (value or "GET").upper()
        return method if method in HTTP_METHODS else "GET"

    @staticmethod
    def _normalize_route(route: str | None) -> str | None:
        if not route:
            return None
        return route if route.startswith("/") else f"/{route}"

    @staticmethod
    def _extract_route_from_url(url: str | None, source_path: str) -> str | None:
        if not url:
            return None
        if url.startswith(("http://", "https://")):
            from urllib.parse import urlparse
            try:
                parsed = urlparse(url)
                return parsed.path if parsed.path.startswith("/") else f"/{parsed.path}"
            except Exception:
                return None
        if url.startswith("/"):
            return url
        if url.startswith(("./", "../")):
            base = os.path.dirname(source_path).replace("\\", "/")
            resolved = os.path.normpath(os.path.join(base, url)).replace("\\", "/")
            return f"/{resolved}"
        return None

    @staticmethod
    def _normalize_entity(value: str | None) -> str | None:
        if not value:
            return None
        normalized = re.sub(r'[`"\[\]]', "", value.strip())
        return normalized or None

    # ---- Git change tracking -----------------------------------------------

    def _detect_changed_files(self) -> None:
        self._changed_files.clear()
        self._changed_status.clear()
        try:
            result = subprocess.run(
                ["git", "-C", self.root_path, "status", "--porcelain"],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode != 0:
                return
            for line in result.stdout.splitlines():
                if not line or len(line) < 4:
                    continue
                status_code = line[:2]
                raw_path = line[3:].strip()
                if not raw_path:
                    continue
                # Handle renames
                if " -> " in raw_path:
                    raw_path = raw_path.split(" -> ")[-1]
                norm_path = raw_path.strip('"').replace("\\", "/")
                status = self._git_status_label(status_code)
                self._changed_files.add(norm_path)
                self._changed_status[norm_path] = status
        except Exception:
            pass

    @staticmethod
    def _git_status_label(status: str) -> str:
        if "?" in status:
            return "untracked"
        if "A" in status:
            return "added"
        if "M" in status:
            return "modified"
        if "D" in status:
            return "deleted"
        if "R" in status:
            return "renamed"
        if "C" in status:
            return "copied"
        if "U" in status:
            return "conflict"
        return "changed"


# ---------------------------------------------------------------------------
#  Public helpers
# ---------------------------------------------------------------------------

def scan_repository(root_path: str, include_change_tracking: bool = False) -> dict[str, Any]:
    """Scan an entire repository and return Cytoscape.js-compatible graph data."""
    scanner = RepoScanner(root_path, include_change_tracking=include_change_tracking)
    return scanner.scan()
