from pydantic import BaseModel, HttpUrl, Field
from typing import Any


class GithubRepoRequest(BaseModel):
    github_url: HttpUrl = Field(..., description="The GitHub repository URL to process")


class GithubRepoResponse(BaseModel):
    message: str
    url: str
    repo_id: str | None = None




class ChatRequest(BaseModel):
    query: str


class ChatResponse(BaseModel):
    answer: str


# ---------------------------------------------------------------------------
#  Simple file-tree graph (legacy)
# ---------------------------------------------------------------------------

class NodeData(BaseModel):
    id: str
    label: str
    type: str
    extension: str | None = None


class Node(BaseModel):
    data: NodeData


class EdgeData(BaseModel):
    id: str
    source: str
    target: str


class Edge(BaseModel):
    data: EdgeData


class GraphResponse(BaseModel):
    nodes: list[Node]
    edges: list[Edge]


# ---------------------------------------------------------------------------
#  Deep dependency graph (ezscan-style)
# ---------------------------------------------------------------------------

class DependencyNode(BaseModel):
    """Rich node payload matching D3 format"""
    id: str
    name: str
    type: str  # file | function | class | module | database | service
    language: str | None = None
    path: str | None = None
    metadata: dict[str, Any] | None = None

class DependencyEdge(BaseModel):
    """Rich edge payload matching D3 format"""
    source: str
    target: str
    type: str  # imports | calls | extends | contains | references | calls_api | serves_api | queries | depends_on
    label: str | None = None


class GraphStats(BaseModel):
    total_nodes: int = 0
    total_edges: int = 0
    files: int = 0
    functions: int = 0
    classes: int = 0
    modules: int = 0
    services: int = 0
    databases: int = 0
    changed_files: int = 0


class DependencyGraphResponse(BaseModel):
    """Full dependency graph response formatted for Cytoscape.js"""
    nodes: list[DependencyNode]
    edges: list[DependencyEdge]
    stats: GraphStats
