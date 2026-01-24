#!/usr/bin/env python3
"""
Simple test script to verify the RISC-V backend is working correctly
"""

import requests
import json
import sys

def test_backend():
    base_url = "http://localhost:8000"
    
    print("Testing RISC-V Pipeline Simulator Backend...")
    print("=" * 50)
    
    try:
        # Test root endpoint
        print("1. Testing root endpoint...")
        response = requests.get(f"{base_url}/")
        if response.status_code == 200:
            print("✅ Root endpoint working")
            data = response.json()
            print(f"   Version: {data.get('version', 'Unknown')}")
            print(f"   ISA: {data.get('current_isa', 'Unknown')}")
            print(f"   Core: {data.get('current_core', 'Unknown')}")
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
            return False
            
        # Test state endpoint
        print("\n2. Testing state endpoint...")
        response = requests.get(f"{base_url}/state")
        if response.status_code == 200:
            print("✅ State endpoint working")
            data = response.json()
            print(f"   Cycle: {data.get('cycle', 0)}")
            print(f"   PC: 0x{data.get('pc', 0):08X}")
            print(f"   Instructions loaded: {len(data.get('instruction_memory', []))}")
        else:
            print(f"❌ State endpoint failed: {response.status_code}")
            return False
            
        # Test config endpoints
        print("\n3. Testing config endpoints...")
        response = requests.get(f"{base_url}/config/options")
        if response.status_code == 200:
            print("✅ Config options endpoint working")
            data = response.json()
            print(f"   Available ISAs: {list(data.get('isas', {}).keys())}")
            print(f"   Available Cores: {list(data.get('cores', {}).keys())}")
        else:
            print(f"❌ Config options endpoint failed: {response.status_code}")
            return False
            
        # Test step endpoint
        print("\n4. Testing step endpoint...")
        response = requests.post(f"{base_url}/step")
        if response.status_code == 200:
            print("✅ Step endpoint working")
            data = response.json()
            print(f"   New cycle: {data.get('cycle', 0)}")
            print(f"   New PC: 0x{data.get('pc', 0):08X}")
        else:
            print(f"❌ Step endpoint failed: {response.status_code}")
            return False
            
        print("\n" + "=" * 50)
        print("🎉 All backend tests passed!")
        print("The backend is ready for frontend connections.")
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server")
        print("Make sure the backend is running on http://localhost:8000")
        print("Run: python backend/main.py")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_backend()
    sys.exit(0 if success else 1)