#!/usr/bin/env python
"""Test AutoSAR endpoints"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_endpoints():
    print("=" * 60)
    print("TESTING AUTOSAR ENDPOINTS")
    print("=" * 60)
    
    # Test 1: Health
    print("\n[1] Health Check...")
    try:
        r = requests.get(f"{BASE_URL}/api/v1/health", timeout=5)
        print(f"    Status: {r.status_code}")
        print(f"    Response: {json.dumps(r.json(), indent=2)}")
    except Exception as e:
        print(f"    ERROR: {e}")
    
    # Test 2: High-risk accounts (SHAP)
    print("\n[2] High-Risk Accounts (SHAP)...")
    try:
        r = requests.get(f"{BASE_URL}/api/shap/high-risk-accounts?limit=3", timeout=5)
        print(f"    Status: {r.status_code}")
        data = r.json()
        print(f"    Response: {json.dumps(data, indent=2)[:500]}...")
    except Exception as e:
        print(f"    ERROR: {e}")
    
    # Test 3: Model reports
    print("\n[3] Model Reports (SHAP)...")
    try:
        r = requests.get(f"{BASE_URL}/api/shap/model-reports", timeout=5)
        print(f"    Status: {r.status_code}")
        data = r.json()
        print(f"    Response: {json.dumps(data, indent=2)[:500]}...")
    except Exception as e:
        print(f"    ERROR: {e}")
    
    # Test 4: API Status
    print("\n[4] API Status...")
    try:
        r = requests.get(f"{BASE_URL}/api/v1/status", timeout=5)
        print(f"    Status: {r.status_code}")
        data = r.json()
        print(f"    Models Loaded: {data.get('models', {}).get('loaded', 'N/A')}")
        print(f"    SHAP Available: {data.get('models', {}).get('shap_available', 'N/A')}")
    except Exception as e:
        print(f"    ERROR: {e}")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    test_endpoints()
