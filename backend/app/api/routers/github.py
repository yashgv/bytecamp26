import os
import requests
import uuid
import logging
import chromadb
import hashlib
from fastapi import APIRouter, HTTPException, status, BackgroundTasks

from app.api.schemas.github import GithubRepoRequest, GithubRepoResponse, ChatRequest, ChatResponse, GraphResponse
from app.core.config import DB_DIR, OPENROUTER_API_KEY, EMBEDDING_MODEL
from app.services.docker_service import clone_repo_in_docker
from app.services.chat_service import get_chat_response
from app.services.graph_service import generate_repo_graph

router = APIRouter(prefix="/github", tags=["GitHub"])
logger = logging.getLogger(__name__)

class OpenRouterEmbeddingFunction(chromadb.EmbeddingFunction):
    def __init__(self, api_key: str, model_name: str):
        self._api_key = api_key
        self._model_name = model_name
        self._url = "https://openrouter.ai/api/v1/embeddings"

    def __call__(self, input: chromadb.Documents) -> chromadb.Embeddings:
        headers = {"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"}
        data = {"model": self._model_name, "input": input}
        try:
            response = requests.post(self._url, headers=headers, json=data)
            res_json = response.json()
            return [item["embedding"] for item in res_json.get("data", []) if "embedding" in item]
        except Exception:
            return []

@router.post("/analyze", response_model=GithubRepoResponse, status_code=status.HTTP_202_ACCEPTED)
async def analyze_github_repo(request: GithubRepoRequest, background_tasks: BackgroundTasks):
    url_str = str(request.github_url)
    if not url_str.startswith("https://github.com/"):
        raise HTTPException(status_code=400, detail="Provided URL must be a valid GitHub repository URL")

    repo_id = hashlib.md5(url_str.encode()).hexdigest()
    background_tasks.add_task(clone_repo_in_docker, url_str, repo_id)

    return GithubRepoResponse(
        message="GitHub repository queued! It will be cloned and indexed in the background.",
        url=url_str,
        repo_id=repo_id
    )

@router.post("/import", response_model=GithubRepoResponse, status_code=status.HTTP_202_ACCEPTED)
async def import_github_repo(request: GithubRepoRequest, background_tasks: BackgroundTasks):
    url_str = str(request.github_url)
    if not url_str.startswith("https://github.com/"):
        raise HTTPException(status_code=400, detail="Provided URL must be a valid GitHub repository URL")

    repo_id = hashlib.md5(url_str.encode()).hexdigest()
    background_tasks.add_task(clone_repo_in_docker, url_str, repo_id)

    return GithubRepoResponse(
        message="GitHub repository queued! It will be cloned and indexed in the background.",
        url=url_str,
        repo_id=repo_id
    )

@router.post("/chat/{repo_id}", response_model=ChatResponse)
def chat_with_repo(repo_id: str, request: ChatRequest):
    db_path = os.path.join(DB_DIR, repo_id)
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="Repository context not found.")
        
    try:
        answer = get_chat_response(repo_id, request.query)
        return ChatResponse(answer=answer)
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{repo_id}")
def check_embedding_status(repo_id: str):
    db_path = os.path.join(DB_DIR, repo_id)
    if not os.path.exists(db_path):
        return {"status": "not_found", "message": "DB directory does not exist yet."}
        
    try:
        chroma_client = chromadb.PersistentClient(path=db_path)
        model_safe_name = hashlib.md5(EMBEDDING_MODEL.encode()).hexdigest()[:10]
        collection_name = f"repo_collection_{model_safe_name}"
        
        embedding_function = OpenRouterEmbeddingFunction(
            api_key=OPENROUTER_API_KEY,
            model_name=EMBEDDING_MODEL
        )
        
        try:
            collection = chroma_client.get_collection(name=collection_name, embedding_function=embedding_function)
            vector_count = collection.count()
            return {
                "status": "ready" if vector_count > 0 else "empty",
                "total_embeddings": vector_count,
                "model": EMBEDDING_MODEL,
                "collection": collection_name
            }
        except Exception:
            collections = chroma_client.list_collections()
            return {
                "status": "indexing_required",
                "message": f"Embeddings for {EMBEDDING_MODEL} not found.",
                "existing_collections": [c.name for c in collections]
            }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/graph/{repo_id}", response_model=GraphResponse)
def get_repo_structure_graph(repo_id: str):
    """
    Returns a graph representation of the repository's file structure.
    """
    try:
        graph_data = generate_repo_graph(repo_id)
        if not graph_data.get("nodes"):
            raise HTTPException(status_code=404, detail="Repository not found or empty.")
        return graph_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Graph generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
