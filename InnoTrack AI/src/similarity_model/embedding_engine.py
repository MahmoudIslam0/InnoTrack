import logging
from pathlib import Path
from typing import List
import pandas as pd
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

from Data.database.sql_connector import load_preprocessed_projects

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

DEFAULT_MODEL = "all-mpnet-base-v2"
TEXT_COL = "clean_text"
TITLE_COL = "project_title"
TECH_COL = "technologies"

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR  = _PROJECT_ROOT / "models"
INDEX_PATH = MODEL_DIR / "faiss_index.bin"
META_PATH  = MODEL_DIR / "metadata.parquet"

class ProjectEmbedder:
    def __init__(self, model_name: str = DEFAULT_MODEL):
        logger.info(f"Loading embedding model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.index = None
        self.metadata = None

    def generate_embeddings(self, texts: List[str], batch_size: int = 64) -> np.ndarray:
        logger.info(f"Generating embeddings for {len(texts)} projects...")
        vectors = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=True,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return vectors.astype("float32")

    def build_index(self, df: pd.DataFrame):
        """Build FAISS cosine index."""
        self.metadata = df.copy()
        self.metadata = self.metadata.reset_index(drop=True)

        for col in [TITLE_COL, TEXT_COL]:
            if col not in self.metadata.columns:
                self.metadata[col] = ""

        if TECH_COL not in self.metadata.columns:
            self.metadata[TECH_COL] = ""

        FEATURE_COL = "features"
        if FEATURE_COL not in self.metadata.columns:
            self.metadata[FEATURE_COL] = ""

        feature_text = self.metadata[FEATURE_COL].fillna("").astype(str)
        rich_texts = (
            self.metadata[TITLE_COL].fillna("").astype(str)
            + " "
            + self.metadata[TEXT_COL].fillna("").astype(str)
            + " "
            + feature_text
        ).tolist()

        embeddings = self.generate_embeddings(rich_texts)
        self.embeddings = embeddings
        dim = embeddings.shape[1]
        
        base_index = faiss.IndexFlatIP(dim)
        self.index = faiss.IndexIDMap(base_index)
        ids = np.arange(len(self.metadata)).astype("int64")
        
        self.index.add_with_ids(embeddings, ids)
        logger.info(f"FAISS index built successfully with {self.index.ntotal} vectors.")

    def save_artifacts(self, folder: str = "models"):
        path = Path(folder)
        path.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, str(path / "faiss_index.bin"))
        self.metadata.to_parquet(path / "metadata.parquet", index=False)
        if hasattr(self, "embeddings"):
            np.save(str(path / "project_embeddings.npy"), self.embeddings)
        logger.info(f"Artifacts saved to {folder}")

    def load_artifacts(self, folder: str = "models"):
        path = Path(folder)
        self.index = faiss.read_index(str(path / "faiss_index.bin"))
        self.metadata = pd.read_parquet(path / "metadata.parquet")
        logger.info("Artifacts loaded successfully.")

def train_embedding_engine():
    logger.info("Loading processed dataset from Azure SQL...")
    df = load_preprocessed_projects()
    
    engine = ProjectEmbedder()
    engine.build_index(df)
    engine.save_artifacts(str(MODEL_DIR))
    
    logger.info("Embedding engine completed successfully.")
    return engine
