import os
import requests
import logging
import chromadb
import hashlib
from app.core.config import DB_DIR, OPENROUTER_API_KEY, EMBEDDING_MODEL

logger = logging.getLogger(__name__)

class OpenRouterEmbeddingFunction(chromadb.EmbeddingFunction):
    def __init__(self, api_key: str, model_name: str):
        self._api_key = api_key
        self._model_name = model_name
        self._url = "https://openrouter.ai/api/v1/embeddings"

    def __call__(self, input: chromadb.Documents) -> chromadb.Embeddings:
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": self._model_name,
            "input": input
        }
        
        try:
            response = requests.post(self._url, headers=headers, json=data)
            if response.status_code != 200:
                logger.error(f"OpenRouter Error: {response.status_code} - {response.text}")
                return []
            
            res_json = response.json()
            if "data" not in res_json:
                logger.error(f"Invalid OpenRouter response structure: {res_json}")
                return []
            
            embeddings = []
            for item in res_json["data"]:
                if "embedding" in item:
                    embeddings.append(item["embedding"])
                else:
                    logger.warning(f"Item in OpenRouter response missing 'embedding' key: {item}")
            
            if not embeddings:
                logger.error(f"Received empty embeddings list from OpenRouter. Response: {res_json}")
                
            return embeddings
            
        except Exception as e:
            logger.error(f"Exception during OpenRouter embedding request: {e}")
            return []

def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 200) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        chunks.append(text[start:start + chunk_size])
        start += chunk_size - overlap
    return chunks

def index_repository(repo_id: str, local_repo_path: str):
    """
    Scans the downloaded repository files, chunks the code, and saves
    the embeddings into a vector database.
    """
    logger.info(f"--- INDEXING START: {repo_id} ---")
    logger.info(f"Target path: {local_repo_path}")
    
    if not OPENROUTER_API_KEY or "your_" in OPENROUTER_API_KEY:
        logger.error("CRITICAL: OPENROUTER_API_KEY is not set or invalid in .env")
        return

    if not os.path.exists(local_repo_path):
        logger.error(f"CRITICAL: Repository directory not found at {local_repo_path}")
        return

    # Scrape local files
    docs = []
    metadatas = []
    ids = []
    valid_extensions = {".py", ".js", ".ts", ".md", ".html", ".css", ".java", ".cpp", ".go", ".json", ".txt", ".c", ".h", ".hpp", ".cs", ".php", ".rb", ".rs"}

    file_count = 0
    for root, _, files in os.walk(local_repo_path):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in valid_extensions:
                file_path = os.path.join(root, file)
                file_count += 1
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        text = f.read()
                        if not text.strip():
                            continue
                        
                        chunks = chunk_text(text)
                        rel_path = os.path.relpath(file_path, local_repo_path)
                        for i, chunk in enumerate(chunks):
                            docs.append(chunk)
                            metadatas.append({"source": rel_path.replace(os.sep, '/')})
                            ids.append(f"{rel_path.replace(os.sep, '/')}_{i}")
                except Exception as e:
                    logger.warning(f"Could not read {file_path}: {e}")

    logger.info(f"Scanned {file_count} files. Total chunks created: {len(docs)}")

    if not docs:
        logger.warning("Indexing aborted: No valid text content found in matched files.")
        return

    try:
        # Custom Embedding Function for more control and logging
        embedding_function = OpenRouterEmbeddingFunction(
            api_key=OPENROUTER_API_KEY,
            model_name=EMBEDDING_MODEL
        )
        
        db_path = os.path.join(DB_DIR, repo_id)
        chroma_client = chromadb.PersistentClient(path=db_path)
        
        model_safe_name = hashlib.md5(EMBEDDING_MODEL.encode()).hexdigest()[:10]
        collection_name = f"repo_collection_{model_safe_name}"
        
        collection = chroma_client.get_or_create_collection(
            name=collection_name, 
            embedding_function=embedding_function
        )
        
        logger.info(f"Connecting to OpenRouter ({EMBEDDING_MODEL}). Sending chunks...")
        
        batch_size = 30 # Even smaller batch size to avoid potential issues
        total_batches = (len(docs) + batch_size - 1) // batch_size
        
        for i in range(0, len(docs), batch_size):
            current_batch = (i // batch_size) + 1
            logger.info(f"Indexing batch {current_batch}/{total_batches}...")
            
            collection.add(
                documents=docs[i:i+batch_size],
                metadatas=metadatas[i:i+batch_size],
                ids=ids[i:i+batch_size]
            )
            
        logger.info(f"SUCCESS: Repository {repo_id} indexed. Total vectors: {collection.count()}")
    except Exception as e:
        logger.error(f"INDEXING FAILED for {repo_id}: {e}")
