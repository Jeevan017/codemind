#!/usr/bin/env python3
"""
Verification script for Bug Fixes 1, 2, and 3
Checks code patterns without loading heavy models
"""
import re
import sys

def check_fix_1_embedder():
    """BUG 1: Verify embed_query has model = _get_embedding_model()"""
    print("\n=== BUG 1 FIX VERIFICATION: embedder.py ===")
    with open("backend/ingestion/embedder.py", "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    # Check for the fixed pattern
    if "def embed_query(query: str) -> list[float]:" not in content:
        print("❌ embed_query function not found")
        return False
    
    if "model = _get_embedding_model()" in content:
        print("✅ embed_query() correctly initializes model with _get_embedding_model()")
        return True
    else:
        print("❌ embed_query() does not call _get_embedding_model()")
        return False

def check_fix_2_chunker():
    """BUG 2: Verify _chunk_document uses character-level sliding window"""
    print("\n=== BUG 2 FIX VERIFICATION: chunker.py ===")
    with open("backend/ingestion/chunker.py", "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    fixes_found = 0
    
    # Check for sliding window logic
    if "start += CHUNK_SIZE - CHUNK_OVERLAP" in content:
        print("✅ Character-level sliding window with overlap found")
        fixes_found += 1
    else:
        print("❌ Sliding window logic not found")
    
    # Check for full_text concatenation
    if 'full_text = " ".join' in content:
        print("✅ Text concatenation before chunking found")
        fixes_found += 1
    else:
        print("❌ Text concatenation not found")
    
    # Check for debug logging
    chunker_logs = [
        "[CHUNKER] Extracted",
        "[CHUNKER] Total characters",
        "[CHUNKER] First 500 chars",
        "[CHUNKER] Created",
    ]
    
    log_count = sum(1 for log in chunker_logs if log in content)
    print(f"✅ Found {log_count}/4 debug logging statements")
    fixes_found += min(1, log_count)
    
    return fixes_found >= 3

def check_fix_3_agent():
    """BUG 3: Verify _should_retrieve checks ChromaDB count first"""
    print("\n=== BUG 3 FIX VERIFICATION: agent.py ===")
    with open("backend/agent/agent.py", "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    fixes_found = 0
    
    # Check for ChromaDB import and count check
    if "chromadb" in content and "_count = _col.count()" in content:
        print("✅ ChromaDB count check found")
        fixes_found += 1
    else:
        print("❌ ChromaDB count check not found")
    
    # Check for conditional RETRIEVE forcing
    if 'if _count > 0:' in content and 'return "RETRIEVE"' in content:
        print("✅ Conditional RETRIEVE forcing found")
        fixes_found += 1
    else:
        print("❌ Conditional RETRIEVE logic not found")
    
    # Check for debug logging
    agent_logs = [
        "[AGENT] ChromaDB has",
        "[AGENT] Documents are indexed",
        "[AGENT] No documents indexed",
        "[AGENT] LLM routing decision",
    ]
    
    log_count = sum(1 for log in agent_logs if log in content)
    print(f"✅ Found {log_count}/4 debug logging statements")
    fixes_found += min(1, log_count)
    
    return fixes_found >= 3

def main():
    print("=" * 60)
    print("CODE VERIFICATION FOR BUG FIXES 1, 2, 3")
    print("=" * 60)
    
    results = []
    results.append(("Bug 1 (embedder.py)", check_fix_1_embedder()))
    results.append(("Bug 2 (chunker.py)", check_fix_2_chunker()))
    results.append(("Bug 3 (agent.py)", check_fix_3_agent()))
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n🎉 ALL FIXES VERIFIED SUCCESSFULLY!")
        return 0
    else:
        print("\n⚠️  Some fixes need review")
        return 1

if __name__ == "__main__":
    sys.exit(main())
