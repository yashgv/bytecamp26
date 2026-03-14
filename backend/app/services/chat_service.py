import os
import requests
import logging
import chromadb
import hashlib
from openai import OpenAI
from app.core.config import DB_DIR, OPENROUTER_API_KEY, EMBEDDING_MODEL, CHAT_MODEL

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
                logger.error(f"OpenRouter Retrieval Error: {response.status_code} - {response.text}")
                return []
            res_json = response.json()
            embeddings = [item["embedding"] for item in res_json.get("data", []) if "embedding" in item]
            return embeddings
        except Exception as e:
            logger.error(f"Chat retrieval embedding exception: {e}")
            return []

def get_chat_response(repo_id: str, query: str):
    """
    Handles retrieval and generation logic for chatting with the repo via OpenRouter.
    """
    db_path = os.path.join(DB_DIR, repo_id)
    
    if not OPENROUTER_API_KEY or "your_" in OPENROUTER_API_KEY:
        return "Error: OPENROUTER_API_KEY is not configured or invalid in .env"

    try:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )

        embedding_function = OpenRouterEmbeddingFunction(
            api_key=OPENROUTER_API_KEY,
            model_name=EMBEDDING_MODEL
        )
        
        chroma_client = chromadb.PersistentClient(path=db_path)
        model_safe_name = hashlib.md5(EMBEDDING_MODEL.encode()).hexdigest()[:10]
        collection_name = f"repo_collection_{model_safe_name}"
        
        try:
            collection = chroma_client.get_collection(name=collection_name, embedding_function=embedding_function)
        except Exception:
            return f"Error: No embeddings found for model {EMBEDDING_MODEL}. Please re-index the repository."

        logger.info(f"Searching for: {query} in {collection_name}")
        results = collection.query(query_texts=[query], n_results=5)
        
        context_parts = []
        if results['documents'] and len(results['documents']) > 0:
            for i, doc in enumerate(results['documents'][0]):
                source = results['metadatas'][0][i].get('source', 'unknown')
                context_parts.append(f"--- File: {source} ---\n{doc}")
                
        context_str = "\n\n".join(context_parts)
        
        if not context_str:
            return "I couldn't find any relevant code in the repository to answer your question."

        prompt = f"""You are a Senior Software Engineer assisting a developer. 
Use the following pieces of retrieved codebase files/context to answer the user's question about the repository.
If you don't know the answer or the context isn't relevant, just say you don't know.

Context:
{context_str}

User Question: {query}"""

        logger.info(f"Generating response using {CHAT_MODEL}...")
        response = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Chat service error: {e}")
        return f"An error occurred while processing your request: {str(e)}"
