import os
import logging
from typing import List, Dict, Any
from app.core.config import REPOS_DIR

logger = logging.getLogger(__name__)

def generate_repo_graph(repo_id: str) -> Dict[str, Any]:
    """
    Generates a graph representation (nodes and edges) of the repository's file structure
    formatted for Cytoscape.js with separate nodes/edges keys.
    """
    repo_path = os.path.join(REPOS_DIR, repo_id, "repo")
    
    if not os.path.exists(repo_path):
        logger.error(f"Repository path not found for repo_id: {repo_id}")
        return {"nodes": [], "edges": []}

    nodes = []
    edges = []
    
    # Root node for the repository itself
    nodes.append({
        "data": {
            "id": "root",
            "label": os.path.basename(repo_path) or repo_id,
            "type": "directory"
        }
    })

    for root, dirs, files in os.walk(repo_path):
        rel_root = os.path.relpath(root, repo_path)
        parent_id = "root" if rel_root == "." else rel_root.replace(os.sep, "/")
        
        # Add directories
        for d in dirs:
            dir_rel_path = os.path.join(rel_root, d)
            dir_id = dir_rel_path.replace(os.sep, "/")
            nodes.append({
                "data": {
                    "id": dir_id,
                    "label": d,
                    "type": "directory"
                }
            })
            edges.append({
                "data": {
                    "id": f"edge_{parent_id}_{dir_id}",
                    "source": parent_id,
                    "target": dir_id
                }
            })
            
        # Add files
        for f in files:
            file_rel_path = os.path.join(rel_root, f)
            file_id = file_rel_path.replace(os.sep, "/")
            nodes.append({
                "data": {
                    "id": file_id,
                    "label": f,
                    "type": "file",
                    "extension": os.path.splitext(f)[1].lower()
                }
            })
            edges.append({
                "data": {
                    "id": f"edge_{parent_id}_{file_id}",
                    "source": parent_id,
                    "target": file_id
                }
            })

    return {"nodes": nodes, "edges": edges}
