import os
import shutil
import tempfile
from git import Repo
from config import (
    SKIP_FOLDERS, SKIP_EXTENSIONS,
    LANGUAGE_MAP, IMAGE_EXTENSIONS, DOCUMENT_EXTENSIONS
)

CODE_EXTENSIONS = set(LANGUAGE_MAP.keys())

def load_from_github(github_url: str) -> tuple[list[dict], str]:
    temp_dir = tempfile.mkdtemp()
    print(f"Cloning {github_url} into {temp_dir}...")
    Repo.clone_from(github_url, temp_dir)
    files = _walk_files(temp_dir)
    return files, temp_dir


def load_from_local(folder_path: str) -> list[dict]:
    files = _walk_files(folder_path)
    return files


def _walk_files(root_path: str) -> list[dict]:
    collected = []

    for root, dirs, files in os.walk(root_path):
        # skip unwanted folders
        dirs[:] = [d for d in dirs if d not in SKIP_FOLDERS]

        for filename in files:
            ext = os.path.splitext(filename)[1].lower()

            # skip unwanted extensions
            if ext in SKIP_EXTENSIONS:
                continue

            filepath = os.path.join(root, filename)

            # categorize file type
            if ext in CODE_EXTENSIONS:
                file_type = "code"
                language = LANGUAGE_MAP.get(ext, "Unknown")
            elif ext in DOCUMENT_EXTENSIONS:
                file_type = "document"
                language = None
            elif ext in IMAGE_EXTENSIONS:
                file_type = "image"
                language = None
            else:
                # skip anything uncategorized
                continue

            collected.append({
                "filepath": filepath,
                "filename": filename,
                "extension": ext,
                "file_type": file_type,
                "language": language
            })

    print(f"Total files found: {len(collected)}")
    return collected


def cleanup_temp(temp_dir: str):
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
        print(f"Cleaned up temp folder: {temp_dir}")