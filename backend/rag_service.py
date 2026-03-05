import os
from groq import Groq
from langchain_community.document_loaders import PyPDFLoader
# 👇 YE LINE CHANGE HUYI HAI (New Import)
from langchain_text_splitters import RecursiveCharacterTextSplitter 
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

class RAGService:
    def __init__(self, groq_api_key, embeddings=None):
        self.client = Groq(api_key=groq_api_key)
        self.documents = []
        # Reuse a shared embeddings instance if provided to avoid loading the model twice
        if embeddings is not None:
            self.embeddings = embeddings
        else:
            self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        self.vector_store = None
        self.db_path = "faiss_index"
        self._load_existing_index()

    def _load_existing_index(self):
        if os.path.exists(self.db_path):
            try:
                # 'allow_dangerous_deserialization=True' is needed for local files now
                self.vector_store = FAISS.load_local(self.db_path, self.embeddings, allow_dangerous_deserialization=True)
                print("RAG: Loaded existing FAISS index.")
            except Exception as e:
                print(f"RAG: Could not load index: {e}")

    def upload_pdf(self, file_path):
        """Index a PDF file into the FAISS vector store. Returns chunk count."""
        try:
            loader = PyPDFLoader(file_path)
            docs = loader.load()
            splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
            chunks = splitter.split_documents(docs)
            if not chunks:
                return 0
            if self.vector_store is None:
                self.vector_store = FAISS.from_documents(chunks, self.embeddings)
            else:
                self.vector_store.add_documents(chunks)
            self.vector_store.save_local(self.db_path)
            self.documents.append(file_path)
            return len(chunks)
        except Exception as e:
            raise Exception(f"Error processing PDF: {str(e)}")

    def query(self, user_query: str, k: int = 3) -> str:
        """Retrieve relevant chunks from user-uploaded documents."""
        if self.vector_store is None or not str(user_query or "").strip():
            return ""
        try:
            docs = self.vector_store.similarity_search(user_query, k=k)
            chunks = [str(getattr(d, "page_content", "")).strip() for d in docs if str(getattr(d, "page_content", "")).strip()]
            return "\n\n---\n\n".join(chunks[:k]).strip()
        except Exception:
            return ""

    def get_answer(self, query: str) -> str:
        """Alias for query() — kept for backward compatibility."""
        return self.query(query)