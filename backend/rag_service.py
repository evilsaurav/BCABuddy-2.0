import os
import asyncio
from groq import Groq
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter 
from langchain_community.vectorstores import FAISS

# Global Singleton for Embeddings (Lazy Loaded)
_EMBEDDINGS_INSTANCE = None

def get_embeddings_singleton():
    global _EMBEDDINGS_INSTANCE
    if _EMBEDDINGS_INSTANCE is None:
        from langchain_huggingface import HuggingFaceEmbeddings
        print("RAG: Initializing HuggingFaceEmbeddings model (Lazy Load)...")
        _EMBEDDINGS_INSTANCE = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    return _EMBEDDINGS_INSTANCE

class RAGService:
    def __init__(self, groq_api_key):
        self.client = Groq(api_key=groq_api_key)
        self.documents = []
        self.vector_store = None
        self.db_path = "faiss_index"
        self._index_loaded = False

    def _lazy_load_index(self):
        if self._index_loaded:
            return
            
        embeddings = get_embeddings_singleton()
        if os.path.exists(self.db_path):
            try:
                self.vector_store = FAISS.load_local(
                    self.db_path, 
                    embeddings, 
                    allow_dangerous_deserialization=True
                )
                print("RAG: Loaded existing FAISS index.")
            except Exception as e:
                print(f"RAG: Could not load index: {e}")
        self._index_loaded = True

    async def upload_pdf(self, file_path):
        """Index a PDF file into the FAISS vector store. Returns chunk count."""
        def _process():
            self._lazy_load_index()
            loader = PyPDFLoader(file_path)
            docs = loader.load()
            splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
            chunks = splitter.split_documents(docs)
            if not chunks:
                return 0
            
            embeddings = get_embeddings_singleton()
            if self.vector_store is None:
                self.vector_store = FAISS.from_documents(chunks, embeddings)
            else:
                self.vector_store.add_documents(chunks)
            
            self.vector_store.save_local(self.db_path)
            self.documents.append(file_path)
            return len(chunks)
            
        return await asyncio.to_thread(_process)

    async def query(self, user_query: str, k: int = 3) -> str:
        """Retrieve relevant chunks asynchronously from user-uploaded documents."""
        if not str(user_query or "").strip():
            return ""
            
        def _search():
            self._lazy_load_index()
            if self.vector_store is None:
                return ""
            try:
                docs = self.vector_store.similarity_search(user_query, k=k)
                chunks = [str(getattr(d, "page_content", "")).strip() for d in docs if str(getattr(d, "page_content", "")).strip()]
                return "\n\n---\n\n".join(chunks[:k]).strip()
            except Exception:
                return ""
                
        return await asyncio.to_thread(_search)

    async def get_answer(self, query: str) -> str:
        """Alias for query() — kept for backward compatibility."""
        return await self.query(query)