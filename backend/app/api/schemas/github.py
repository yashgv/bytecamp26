from pydantic import BaseModel, HttpUrl, Field

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
