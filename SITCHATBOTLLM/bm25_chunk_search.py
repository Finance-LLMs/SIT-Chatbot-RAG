# bm25_helper.py

import pickle
import os
from rank_bm25 import BM25Okapi
from functools import lru_cache
import json
from nltk.tokenize import word_tokenize
import re
import time
import lancedb
import pandas as pd

# Normalize for case-insensitive exact match
def normalize_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\w\s]", "", text)
    return text.lower().strip()

# Load cached BM25 index from LanceDB
@lru_cache(maxsize=1)
def load_bm25_index():
    import time
    import lancedb
    
    start = time.time()
    
    try:
        # Connect to LanceDB and load BM25 data
        # Try the path that works for the main server
        db = lancedb.connect("../data/vector-index-lancedb")
        print(f"🔍 Trying path: ../data/vector-index-lancedb")
        tables = db.table_names()
        print(f"📋 Available tables: {tables}")
        
        if "bm25_index" not in tables:
            print("❌ bm25_index not found, trying local path...")
            db = lancedb.connect("data/vector-index-lancedb")
            print(f"🔍 Trying path: data/vector-index-lancedb")
            tables = db.table_names()
            print(f"📋 Available tables: {tables}")
        
        bm25_table = db.open_table("bm25_index")
        
        # Load all BM25 data from LanceDB
        bm25_data = bm25_table.to_pandas()
        
        # Extract documents and metadata
        documents = bm25_data['text'].tolist()
        metadata_list = [eval(metadata) if isinstance(metadata, str) and metadata.startswith('{') 
                        else {'source': 'unknown'} 
                        for metadata in bm25_data['metadata'].tolist()]
        
        # Rebuild BM25 index from documents
        tokenized_docs = [normalize_text(doc).split() for doc in documents]
        bm25 = BM25Okapi(tokenized_docs)
        
        print(f"✅ BM25 index loaded from LanceDB in {time.time() - start:.2f} seconds")
        print(f"📊 Loaded {len(documents)} documents for BM25 search")

        print("Returned BM25 index, documents, and metadata list")
        print(f"BM25 index: {bm25}")
        print(f"Documents: {documents}")
        print(f"Metadata: {metadata_list}")

        return bm25, documents, metadata_list
        
    except Exception as e:
        print(f"❌ Error loading BM25 from LanceDB: {e}")
        # Fallback to pickle file if it exists
        index_path = "bm25_index.pkl"
        if not os.path.exists(index_path):
            raise FileNotFoundError("BM25 index not found in LanceDB or pickle file. Run bm25 indexer first.")
        with open(index_path, "rb") as f:
            bm25, documents, metadata_list = pickle.load(f)
        print(f"✅ BM25 index loaded from pickle in {time.time() - start:.2f} seconds")
        return bm25, documents, metadata_list

# Retrieve top N docs using BM25
def search_bm25(query, top_n=3):
    bm25, documents, metadata_list = load_bm25_index()

    norm_query = normalize_text(query)
    tokenized_query = norm_query.split()
    base_scores = bm25.get_scores(tokenized_query)

    # NO document normalization needed anymore

    top_indices = sorted(range(len(base_scores)), key=lambda i: base_scores[i], reverse=True)[:top_n]
    top_docs = [{"content": documents[i], "metadata": metadata_list[i]} for i in top_indices]

    return top_docs




# if __name__ == "__main__":
#     # Manual test for BM25
#     query = "Who are some profs working on speech privacy"
#     print(f"🔎 Searching BM25 for: '{query}'")
#     results = search_bm25(query, top_n=10)

#     for i, result in enumerate(results, 1):
#         print(f"\n--- Result {i} ---")
#         print("Metadata:", result["metadata"])
#         print("Snippet:", result["content"][:500])  # Print a preview of the chunk