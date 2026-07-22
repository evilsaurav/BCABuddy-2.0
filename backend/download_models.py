import os

def download_easyocr():
    print("Downloading EasyOCR models...")
    try:
        import easyocr
        # This will download the english model
        reader = easyocr.Reader(['en'], gpu=False)
        print("EasyOCR models downloaded successfully.")
    except Exception as e:
        print(f"Error downloading EasyOCR: {e}")

def download_sentence_transformers():
    print("Downloading Sentence Transformer models...")
    try:
        from sentence_transformers import SentenceTransformer
        # Same model used in rag_service.py
        model = SentenceTransformer('all-MiniLM-L6-v2')
        print("Sentence Transformer models downloaded successfully.")
    except Exception as e:
        print(f"Error downloading Sentence Transformers: {e}")

if __name__ == "__main__":
    download_easyocr()
    download_sentence_transformers()
