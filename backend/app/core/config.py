import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.getcwd()
REPOS_DIR = os.path.join(BASE_DIR, "repositories")
DB_DIR = os.path.join(BASE_DIR, "chroma_db")

os.makedirs(REPOS_DIR, exist_ok=True)
os.makedirs(DB_DIR, exist_ok=True)

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

# Default Models
EMBEDDING_MODEL = "nvidia/llama-nemotron-embed-vl-1b-v2:free" # Generic OpenRouter path
CHAT_MODEL = "google/gemini-2.0-flash-001"        # Example OpenRouter path
