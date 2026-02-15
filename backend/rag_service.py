import os
from groq import Groq
from langchain_community.document_loaders import PyPDFLoader
# 👇 YE LINE CHANGE HUYI HAI (New Import)
from langchain_text_splitters import RecursiveCharacterTextSplitter 
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

class RAGService:
    def __init__(self, groq_api_key):
        self.client = Groq(api_key=groq_api_key)
        self.documents = []
        # CPU optimized model for embeddings
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
        """Placeholder for PDF upload - returns chunk count"""
        try:
            # Simulate PDF processing
            self.documents.append(file_path)
            return 5  # Default chunks
        except Exception as e:
            raise Exception(f"Error processing PDF: {str(e)}")

    def get_answer(self, query):
        """Get answer from documents using RAG"""
        try:
            if not self.documents:
                return f"No documents uploaded. Please upload PDFs first."
            
            # Simulate RAG - in production, would use vector DB
            return f"Context from PDF: {query[:50]}... (RAG processing)"
        except Exception as e:
            return f"Error: {str(e)}"