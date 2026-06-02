"""Quick validation script to test the new architecture."""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "app"))


def test_imports():
    """Test that all modules can be imported."""
    print("✓ Testing imports...")
    
    try:
        from app.ports import (
            EmbeddingPort,
            GitClientPort,
            LLMPort,
            RepositoryMetadataPort,
            VectorStorePort,
        )
        print("  ✓ Ports imported")
        
        from app.dependencies import (
            get_chat_service,
            get_embedding_service,
            get_git_client,
            get_llm_client,
            get_metadata_adapter,
            get_repo_service,
            get_vector_store,
        )
        print("  ✓ Dependencies imported")
        
        from app.infrastructure.settings import Settings, get_settings
        print("  ✓ Settings imported")
        
        from app.services.models import RepositoryRecord
        print("  ✓ Models imported")
        
        return True
    except Exception as e:
        print(f"  ✗ Import error: {e}")
        return False


def test_dependency_injection():
    """Test that DI container works."""
    print("\n✓ Testing dependency injection...")
    
    try:
        from app.dependencies import get_chat_service, get_repo_service
        
        repo_service = get_repo_service()
        print(f"  ✓ RepoService created: {type(repo_service).__name__}")
        
        chat_service = get_chat_service()
        print(f"  ✓ ChatService created: {type(chat_service).__name__}")
        
        return True
    except Exception as e:
        print(f"  ✗ DI error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_protocol_compliance():
    """Test that adapters implement ports correctly."""
    print("\n✓ Testing protocol compliance...")
    
    try:
        from app.dependencies import get_settings_cached
        from app.infrastructure.chroma_adapter import ChromaAdapter
        from app.infrastructure.postgres_adapter import PostgresAdapter
        from app.ports import RepositoryMetadataPort, VectorStorePort
        
        settings = get_settings_cached()
        
        # Check PostgresAdapter implements RepositoryMetadataPort
        postgres = PostgresAdapter(settings)
        assert hasattr(postgres, "create_repository")
        assert hasattr(postgres, "get_repository")
        assert hasattr(postgres, "update_repository_status")
        print("  ✓ PostgresAdapter implements RepositoryMetadataPort")
        
        # Check ChromaAdapter implements VectorStorePort
        chroma = ChromaAdapter(settings)
        assert hasattr(chroma, "upsert_chunks")
        assert hasattr(chroma, "query")
        print("  ✓ ChromaAdapter implements VectorStorePort")
        
        return True
    except Exception as e:
        print(f"  ✗ Protocol error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_settings():
    """Test settings configuration."""
    print("\n✓ Testing settings...")
    
    try:
        from app.infrastructure.settings import get_settings
        
        settings = get_settings()
        print(f"  ✓ API Title: {settings.api_title}")
        print(f"  ✓ Embedding Model: {settings.embedding_model}")
        print(f"  ✓ Embedding Dim: {settings.embedding_dim}")
        print(f"  ✓ LLM Model: {settings.llm_model}")
        print(f"  ✓ Chunk Size: {settings.chunk_size}")
        print(f"  ✓ Chunk Overlap: {settings.chunk_overlap}")
        
        if settings.anthropic_api_key:
            print(f"  ✓ Anthropic API Key: configured")
        else:
            print(f"  ⚠ Anthropic API Key: not configured (will use fallback)")
        
        return True
    except Exception as e:
        print(f"  ✗ Settings error: {e}")
        return False


def main():
    """Run all validation tests."""
    print("=" * 60)
    print("CodeCompass Backend Architecture Validation")
    print("=" * 60)
    
    results = []
    results.append(("Imports", test_imports()))
    results.append(("Dependency Injection", test_dependency_injection()))
    results.append(("Protocol Compliance", test_protocol_compliance()))
    results.append(("Settings", test_settings()))
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n✅ All validation tests passed!")
        print("\nNext steps:")
        print("1. Configure ANTHROPIC_API_KEY in .env for real LLM responses")
        print("2. Run: uvicorn app.main:app --reload")
        print("3. Visit: http://localhost:8000/docs")
        return 0
    else:
        print("\n❌ Some validation tests failed.")
        print("Please check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
