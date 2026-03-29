"""ChromaDB vector database management with multi-collection support."""

import logging
import os
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings

from config import settings

logger = logging.getLogger(__name__)

# Valid collection names
VALID_COLLECTIONS = {settings.chroma_collection_guest, settings.chroma_collection_business}


class VectorDB:
    """ChromaDB vector database wrapper with multi-collection support."""

    def __init__(self):
        """Initialize ChromaDB client."""
        self.client = None
        self.collections: Dict[str, Any] = {}
        self._initialize()

    def _initialize(self):
        """Initialize ChromaDB client and collections."""
        try:
            persist_dir = os.path.abspath(settings.chroma_persist_dir)
            os.makedirs(persist_dir, exist_ok=True)

            logger.info(f"Initializing ChromaDB at: {persist_dir}")

            self.client = chromadb.PersistentClient(
                path=persist_dir,
                settings=ChromaSettings(
                    anonymized_telemetry=False,
                    allow_reset=True,
                ),
            )

            # Create both collections
            self.collections[settings.chroma_collection_guest] = (
                self.client.get_or_create_collection(
                    name=settings.chroma_collection_guest,
                    metadata={"description": "Guest/AI Playground documents"},
                )
            )
            self.collections[settings.chroma_collection_business] = (
                self.client.get_or_create_collection(
                    name=settings.chroma_collection_business,
                    metadata={"description": "Business documents"},
                )
            )

            logger.info(
                f"ChromaDB initialized: collections "
                f"'{settings.chroma_collection_guest}' ({self.collections[settings.chroma_collection_guest].count()}), "
                f"'{settings.chroma_collection_business}' ({self.collections[settings.chroma_collection_business].count()})"
            )

            # Migrate legacy collection if it exists
            self._migrate_legacy()

        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            raise

    def _migrate_legacy(self):
        """Migrate data from legacy 'evaluation_documents' collection to 'business'."""
        try:
            existing_names = [c.name for c in self.client.list_collections()]
            legacy_name = settings.chroma_collection_name

            if legacy_name not in existing_names:
                return

            legacy_collection = self.client.get_collection(name=legacy_name)
            count = legacy_collection.count()

            if count == 0:
                self.client.delete_collection(name=legacy_name)
                logger.info(f"Deleted empty legacy collection '{legacy_name}'")
                return

            logger.info(f"Migrating {count} documents from '{legacy_name}' to '{settings.chroma_collection_business}'...")

            # Get all data from legacy collection
            data = legacy_collection.get(include=["documents", "metadatas", "embeddings"])

            if data["ids"]:
                business = self.collections[settings.chroma_collection_business]
                # Add in batches to avoid memory issues
                batch_size = 500
                for i in range(0, len(data["ids"]), batch_size):
                    end = min(i + batch_size, len(data["ids"]))
                    business.add(
                        ids=data["ids"][i:end],
                        documents=data["documents"][i:end],
                        embeddings=data["embeddings"][i:end],
                        metadatas=data["metadatas"][i:end],
                    )

            # Delete legacy collection
            self.client.delete_collection(name=legacy_name)
            logger.info(
                f"Migration completed: {count} documents moved to '{settings.chroma_collection_business}', "
                f"legacy collection '{legacy_name}' deleted"
            )

        except Exception as e:
            logger.error(f"Legacy migration failed (non-fatal): {e}")

    def _get_collection(self, collection: Optional[str] = None):
        """Get collection by name, defaulting to business."""
        name = collection or settings.chroma_default_collection
        if name not in self.collections:
            raise ValueError(f"Unknown collection: {name}. Valid: {VALID_COLLECTIONS}")
        return self.collections[name]

    def add_documents(
        self,
        ids: List[str],
        documents: List[str],
        embeddings: List[List[float]],
        metadatas: Optional[List[Dict[str, Any]]] = None,
        collection: Optional[str] = None,
    ) -> None:
        """Add documents to a collection."""
        try:
            col = self._get_collection(collection)
            col.add(
                ids=ids,
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas,
            )
            logger.info(f"Added {len(ids)} documents to collection '{col.name}'")
        except Exception as e:
            logger.error(f"Failed to add documents: {e}")
            raise

    def query(
        self,
        query_embeddings: List[List[float]],
        n_results: int = 3,
        where: Optional[Dict[str, Any]] = None,
        collection: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Query a collection for similar documents."""
        try:
            col = self._get_collection(collection)
            results = col.query(
                query_embeddings=query_embeddings,
                n_results=n_results,
                where=where,
            )
            logger.info(f"Query on '{col.name}' returned {len(results['ids'][0])} results")
            return results
        except Exception as e:
            logger.error(f"Failed to query collection: {e}")
            raise

    def get_all_documents(self, collection: Optional[str] = None) -> Dict[str, Any]:
        """Get all documents from a collection."""
        try:
            col = self._get_collection(collection)
            results = col.get()
            logger.info(f"Retrieved {len(results['ids'])} documents from '{col.name}'")
            return results
        except Exception as e:
            logger.error(f"Failed to get documents: {e}")
            raise

    def delete_documents(self, ids: List[str], collection: Optional[str] = None) -> None:
        """Delete documents from a collection."""
        try:
            col = self._get_collection(collection)
            col.delete(ids=ids)
            logger.info(f"Deleted {len(ids)} documents from collection '{col.name}'")
        except Exception as e:
            logger.error(f"Failed to delete documents: {e}")
            raise

    def get_by_metadata(self, where: Dict[str, Any], collection: Optional[str] = None) -> Dict[str, Any]:
        """Get documents filtered by metadata."""
        try:
            col = self._get_collection(collection)
            results = col.get(where=where)
            logger.info(f"Retrieved {len(results['ids'])} documents by metadata filter from '{col.name}'")
            return results
        except Exception as e:
            logger.error(f"Failed to get documents by metadata: {e}")
            raise

    def delete_by_filename_and_user(self, filename: str, user_id: str, collection: Optional[str] = None) -> int:
        """Delete all documents associated with a filename and user_id."""
        try:
            col = self._get_collection(collection)
            results = col.get(
                where={"$and": [{"filename": filename}, {"user_id": user_id}]}
            )
            if results['ids']:
                col.delete(ids=results['ids'])
                count = len(results['ids'])
                logger.info(f"Deleted {count} chunks for file: {filename} (user: {user_id}) from '{col.name}'")
                return count
            else:
                logger.info(f"No documents found for file: {filename} (user: {user_id}) in '{col.name}'")
                return 0
        except Exception as e:
            logger.error(f"Failed to delete by filename and user: {e}")
            raise

    def delete_by_filename(self, filename: str, collection: Optional[str] = None) -> int:
        """Delete all documents associated with a filename."""
        try:
            col = self._get_collection(collection)
            results = col.get(where={"filename": filename})
            if results['ids']:
                col.delete(ids=results['ids'])
                count = len(results['ids'])
                logger.info(f"Deleted {count} chunks for file: {filename} from '{col.name}'")
                return count
            else:
                logger.info(f"No documents found for file: {filename} in '{col.name}'")
                return 0
        except Exception as e:
            logger.error(f"Failed to delete by filename: {e}")
            raise

    def count(self, collection: Optional[str] = None) -> int:
        """Count total documents in a collection."""
        try:
            col = self._get_collection(collection)
            return col.count()
        except Exception as e:
            logger.error(f"Failed to count documents: {e}")
            raise

    def reset(self, collection: Optional[str] = None) -> None:
        """Reset a specific collection (delete all documents)."""
        try:
            col = self._get_collection(collection)
            name = col.name
            self.client.delete_collection(name=name)
            self.collections[name] = self.client.create_collection(
                name=name,
                metadata=col.metadata,
            )
            logger.info(f"Reset collection: '{name}'")
        except Exception as e:
            logger.error(f"Failed to reset collection: {e}")
            raise

    def get_collection_stats(self) -> Dict[str, int]:
        """Get document count for all collections."""
        stats = {}
        for name, col in self.collections.items():
            try:
                stats[name] = col.count()
            except Exception:
                stats[name] = -1
        return stats


# Global VectorDB instance
vector_db = VectorDB()
