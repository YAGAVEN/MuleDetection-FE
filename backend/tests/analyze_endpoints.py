#!/usr/bin/env python3
"""
Analyze GAN API endpoints by code review (no imports needed)
"""

import re
from pathlib import Path

def analyze_endpoints():
    """Analyze endpoints from code"""
    print("�� GAN API Endpoint Analysis")
    print("=" * 80)
    
    # Read the routes file
    routes_file = Path(__file__).parent / "app/api/gan_routes.py"
    service_file = Path(__file__).parent / "app/services/gan_training.py"
    
    if not routes_file.exists():
        print(f"❌ Routes file not found: {routes_file}")
        return
    
    routes_content = routes_file.read_text()
    service_content = service_file.read_text()
    
    # Find all endpoints
    print("\n📌 Registered Endpoints:")
    print("-" * 80)
    
    endpoint_pattern = r'@router\.(get|post|put|delete)\("([^"]+)"'
    endpoints = re.findall(endpoint_pattern, routes_content)
    
    for i, (method, path) in enumerate(endpoints, 1):
        print(f"{i:2}. {method.upper():6} /api/v1/gan{path}")
    
    print(f"\n✅ Total endpoints: {len(endpoints)}")
    
    # Check for issues
    print("\n\n🐛 Potential Issues Found:")
    print("=" * 80)
    
    issues = []
    
    # Issue 1: Check if get_training_status returns 'status' field
    print("\n[CHECK 1] Health endpoint response fields...")
    if "'status'" in service_content or '"status"' in service_content:
        pattern = r'def get_training_status.*?return \{(.*?)\}'
        match = re.search(pattern, service_content, re.DOTALL)
        if match:
            return_dict = match.group(1)
            if "'status'" in return_dict or '"status"' in return_dict:
                print("  ✅ 'status' field present in get_training_status()")
            else:
                print("  ❌ 'status' field MISSING in get_training_status()")
                print(f"\n     Current return dict:")
                print(f"     {return_dict[:200]}...")
                issues.append("Missing 'status' field in health response")
    
    # Issue 2: Check data_shape serialization
    print("\n[CHECK 2] Checking SyntheticDataResponse model...")
    synthetic_pattern = r'class SyntheticDataResponse.*?data_shape: (\w+)'
    match = re.search(synthetic_pattern, routes_content, re.DOTALL)
    if match:
        field_type = match.group(1)
        print(f"  data_shape type: {field_type}")
        if 'tuple' in field_type.lower():
            print(f"  ⚠️  WARNING: tuple type may not serialize to JSON properly")
            issues.append("data_shape uses 'tuple' instead of list/sequence")
        else:
            print(f"  ✅ data_shape type looks OK")
    
    # Issue 3: Check for unimplemented endpoints
    print("\n[CHECK 3] Checking endpoint implementations...")
    
    # Find all async/def functions with routes
    func_pattern = r'@router\.\w+\("([^"]+)"\)\s*async def (\w+)\('
    functions = re.findall(func_pattern, routes_content)
    
    incomplete = []
    for path, func_name in functions:
        # Check if function body is just "pass" or raises NotImplementedError
        func_pattern2 = rf'async def {func_name}\(.*?\n(.*?)(?=\n@router|\nif __name__|\Z)'
        match = re.search(func_pattern2, routes_content, re.DOTALL)
        if match:
            body = match.group(1)
            if 'NotImplementedError' in body or body.strip().endswith('pass'):
                incomplete.append((path, func_name))
                print(f"  ⚠️  {path} ({func_name}) appears incomplete")
    
    if not incomplete:
        print(f"  ✅ All endpoints appear implemented")
    
    # Issue 4: Check for missing error handling
    print("\n[CHECK 4] Checking error handling...")
    error_handlers = len(re.findall(r'except.*?HTTPException', routes_content))
    print(f"  Found {error_handlers} try/except blocks with error handling")
    if error_handlers > 0:
        print(f"  ✅ Error handling in place")
    
    # Issue 5: Check Pydantic models
    print("\n[CHECK 5] Checking Pydantic response models...")
    model_pattern = r'class (\w+Response)\(BaseModel\):(.*?)(?=class|\nrouter|\Z)'
    models = re.findall(model_pattern, routes_content, re.DOTALL)
    
    for model_name, model_body in models:
        field_count = len(re.findall(r':\s*\w+\s*=', model_body))
        print(f"  ✅ {model_name}: {field_count} fields")
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 SUMMARY")
    print("=" * 80)
    print(f"Total endpoints: {len(endpoints)}")
    print(f"Response models: {len(models)}")
    
    if issues:
        print(f"\n⚠️  Issues requiring attention ({len(issues)}):")
        for issue in issues:
            print(f"   • {issue}")
        return False
    else:
        print(f"\n✅ No critical issues found")
        return True

if __name__ == "__main__":
    analyze_endpoints()
