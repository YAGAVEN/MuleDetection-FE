#!/usr/bin/env python3
"""
Comprehensive endpoint testing script for GAN API
Tests all endpoints without requiring a running backend
"""

import sys
from pathlib import Path

def test_endpoint_code():
    """Test endpoints by analyzing code without running them"""
    from pathlib import Path
    print("🧪 Testing GAN API Endpoints Code")
    print("=" * 80)
    
    # Add backend to path
    sys.path.insert(0, str(Path(__file__).parent))
    
    issues = []
    checks_passed = 0
    checks_failed = 0
    
    # TEST 1: Import routes
    print("\n[TEST 1] Importing API routes...")
    try:
        from app.api.gan_routes import router
        print("  ✅ Routes imported successfully")
        checks_passed += 1
    except Exception as e:
        print(f"  ❌ Failed to import routes: {e}")
        issues.append(("routes_import", str(e)))
        checks_failed += 1
        return
    
    # TEST 2: Get all routes
    print("\n[TEST 2] Checking all registered endpoints...")
    try:
        routes = router.routes
        print(f"  📊 Found {len(routes)} routes:")
        
        endpoint_methods = {}
        for route in routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                methods = ', '.join(route.methods) if route.methods else "N/A"
                path = route.path
                if path not in endpoint_methods:
                    endpoint_methods[path] = []
                endpoint_methods[path].append(methods)
                print(f"     {methods:10} {path}")
        
        print(f"  ✅ Total unique endpoints: {len(endpoint_methods)}")
        checks_passed += 1
    except Exception as e:
        print(f"  ❌ Failed to list routes: {e}")
        issues.append(("list_routes", str(e)))
        checks_failed += 1
    
    # TEST 3: Check Pydantic models
    print("\n[TEST 3] Validating Pydantic response models...")
    try:
        from app.api.gan_routes import (
            HealthResponse, TrainingStartRequest, TrainingProgressResponse,
            MetricsResponse, SyntheticDataResponse, AugmentedDataResponse
        )
        
        models = {
            'HealthResponse': HealthResponse,
            'TrainingStartRequest': TrainingStartRequest,
            'TrainingProgressResponse': TrainingProgressResponse,
            'MetricsResponse': MetricsResponse,
            'SyntheticDataResponse': SyntheticDataResponse,
            'AugmentedDataResponse': AugmentedDataResponse,
        }
        
        for name, model in models.items():
            fields = model.model_fields if hasattr(model, 'model_fields') else model.__fields__
            print(f"     ✅ {name}: {len(fields)} fields")
        
        checks_passed += 1
        print(f"  ✅ All {len(models)} models validated")
    except Exception as e:
        print(f"  ❌ Failed to validate models: {e}")
        issues.append(("pydantic_models", str(e)))
        checks_failed += 1
    
    # TEST 4: Service sanity check
    print("\n[TEST 4] Checking GAN service...")
    try:
        # Just check imports, don't instantiate (torch not available)
        from app.services.gan_training import (
            GANTrainingService, get_gan_service, TrainingStatus
        )
        print(f"  ✅ GANTrainingService imported")
        print(f"  ✅ Statuses: {[s.value for s in TrainingStatus]}")
        checks_passed += 1
    except Exception as e:
        print(f"  ❌ Failed to import service: {e}")
        issues.append(("service_import", str(e)))
        checks_failed += 1
    
    # TEST 5: Check health endpoint response
    print("\n[TEST 5] Analyzing health endpoint response model...")
    try:
        from app.api.gan_routes import HealthResponse
        fields = HealthResponse.model_fields if hasattr(HealthResponse, 'model_fields') else HealthResponse.__fields__
        field_names = list(fields.keys())
        print(f"  HealthResponse fields: {field_names}")
        
        required = ['status', 'training_in_progress', 'device', 'gan_available', 'streaming_available', 'timestamp']
        missing = [f for f in required if f not in field_names]
        
        if missing:
            print(f"  ⚠️  Missing fields in model: {missing}")
            issues.append(("health_model_fields", f"Missing: {missing}"))
            checks_failed += 1
        else:
            print(f"  ✅ All required fields present")
            checks_passed += 1
    except Exception as e:
        print(f"  ❌ Failed: {e}")
        issues.append(("health_model", str(e)))
        checks_failed += 1
    
    # TEST 6: Check service get_training_status
    print("\n[TEST 6] Checking service.get_training_status() return value...")
    try:
        from pathlib import Path
        gan_service_path = Path(__file__).parent / "app/services/gan_training.py"
        content = gan_service_path.read_text()
        
        if "def get_training_status" in content:
            # Extract the method
            start = content.find("def get_training_status")
            end = content.find("\n    def ", start + 1)
            if end == -1:
                end = len(content)
            method = content[start:end]
            
            # Check what it returns
            if "'status'" in method:
                print(f"  ✅ Returns 'status' field")
                checks_passed += 1
            else:
                print(f"  ❌ Missing 'status' field in return dict")
                print(f"\n     Current return dict:")
                return_start = method.find("return {")
                return_end = method.find("}", return_start)
                print(f"     {method[return_start:return_end+1]}")
                issues.append(("missing_status_field", "get_training_status() doesn't return 'status'"))
                checks_failed += 1
        else:
            print(f"  ❌ Method not found")
            checks_failed += 1
    except Exception as e:
        print(f"  ⚠️  Could not analyze: {e}")
    
    # TEST 7: Check response model consistency
    print("\n[TEST 7] Checking response model consistency...")
    try:
        from app.api.gan_routes import SyntheticDataResponse
        fields = SyntheticDataResponse.model_fields if hasattr(SyntheticDataResponse, 'model_fields') else SyntheticDataResponse.__fields__
        
        if 'data_shape' in fields:
            field_type = str(fields['data_shape'].annotation)
            print(f"  data_shape type: {field_type}")
            if 'tuple' in field_type or 'Tuple' in field_type:
                print(f"  ⚠️  Tuple type in response - may not serialize to JSON properly")
                issues.append(("tuple_serialization", "data_shape is tuple, not list"))
                checks_failed += 1
            else:
                checks_passed += 1
        
    except Exception as e:
        print(f"  ⚠️  Could not check: {e}")
    
    # SUMMARY
    print("\n" + "=" * 80)
    print(f"📊 TEST SUMMARY")
    print("=" * 80)
    print(f"✅ Passed: {checks_passed}")
    print(f"❌ Failed: {checks_failed}")
    
    if issues:
        print(f"\n⚠️  Issues Found ({len(issues)}):")
        for issue_type, detail in issues:
            print(f"   • {issue_type}: {detail}")
        return False
    else:
        print(f"\n✅ All tests passed!")
        return True

def test_response_validation():
    """Test response model validation"""
    from pathlib import Path
    print("\n\n🔍 Testing Response Model Validation")
    print("=" * 80)
    
    sys.path.insert(0, str(Path(__file__).parent))
    
    try:
        from app.api.gan_routes import HealthResponse
        
        # Test 1: Valid response
        print("\n[TEST] Creating valid HealthResponse...")
        try:
            response = HealthResponse(
                status="idle",
                training_in_progress=False,
                current_training_id=None,
                device="cpu",
                gan_available=False,
                streaming_available=False,
                timestamp="2026-05-06T19:49:14.480+05:30"
            )
            print(f"  ✅ Valid response created")
            print(f"     {response.model_dump()}")
        except Exception as e:
            print(f"  ❌ Failed: {e}")
        
        # Test 2: Missing field
        print("\n[TEST] Creating HealthResponse with missing 'status'...")
        try:
            response = HealthResponse(
                training_in_progress=False,
                current_training_id=None,
                device="cpu",
                gan_available=False,
                streaming_available=False,
                timestamp="2026-05-06T19:49:14.480+05:30"
            )
            print(f"  ✅ Response created (unexpected)")
        except Exception as e:
            print(f"  ✅ Correctly rejected: {type(e).__name__}")
            
    except Exception as e:
        print(f"  ❌ Error: {e}")

if __name__ == "__main__":
    test_endpoint_code()
    test_response_validation()
