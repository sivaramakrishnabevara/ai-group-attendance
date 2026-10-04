import numpy as np

def cosine_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
    """
    Computes standard cosine similarity between two embeddings.
    Cosine Similarity = (u . v) / (||u|| * ||v||)
    Returns value in range [-1.0, 1.0].
    """
    e1 = np.asarray(embedding1, dtype=np.float32).flatten()
    e2 = np.asarray(embedding2, dtype=np.float32).flatten()

    norm1 = np.linalg.norm(e1)
    norm2 = np.linalg.norm(e2)

    if norm1 == 0 or norm2 == 0:
        return 0.0

    dot = float(np.dot(e1, e2))
    sim = dot / (norm1 * norm2)
    # Clip to valid numeric range
    return float(np.clip(sim, -1.0, 1.0))

def l2_normalize(embedding: np.ndarray) -> np.ndarray:
    """L2 normalizes embedding vector to unit length."""
    arr = np.asarray(embedding, dtype=np.float32)
    norm = np.linalg.norm(arr)
    if norm > 0:
        return arr / norm
    return arr
