import os
import docker
import logging
from app.core.config import REPOS_DIR
from app.services.indexing_service import index_repository

logger = logging.getLogger(__name__)

def clone_repo_in_docker(github_url: str, repo_id: str):
    """
    Background task to clone the repo into a host-mounted directory using Docker.
    """
    local_volume_dir = os.path.join(REPOS_DIR, repo_id)
    repo_path = os.path.join(local_volume_dir, "repo")
    
    # Check if repo already exists and is not empty
    if os.path.exists(repo_path) and os.listdir(repo_path):
        logger.info(f"Repository {github_url} already exists at {repo_path}. Skipping clone.")
        # Trigger indexing in case it's a resume or update
        index_repository(repo_id, repo_path)
        return

    os.makedirs(local_volume_dir, exist_ok=True)

    try:
        client = docker.from_env()
        logger.info(f"Starting ephemeral container to clone {github_url} into local {local_volume_dir}...")
        
        container = client.containers.run(
            image="alpine/git",
            command=["clone", github_url, "/workspace/repo"],
            volumes={local_volume_dir: {'bind': '/workspace', 'mode': 'rw'}},
            detach=True
        )
        result = container.wait()
        
        if result['StatusCode'] != 0:
            error_logs = container.logs().decode('utf-8')
            logger.error(f"Git clone operation failed with exit code: {result['StatusCode']}")
            logger.error(f"Container logs: {error_logs}")
        else:
            logger.info(f"Successfully cloned repository {github_url}.")
            index_repository(repo_id, os.path.join(local_volume_dir, "repo"))
            
        container.remove()
            
    except docker.errors.ImageNotFound:
        logger.warning("Image alpine/git not found. Pulling from Docker Hub...")
        client.images.pull("alpine/git")
        clone_repo_in_docker(github_url, repo_id)
    except Exception as e:
        logger.error(f"Error during cloning/indexing pipeline: {e}")
