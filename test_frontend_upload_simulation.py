#!/usr/bin/env python3
"""
Test Frontend Upload Simulation
Simulates what happens when frontend tries to upload to non-existent bucket
"""

import os
import requests
import json
from datetime import datetime

# Load environment variables manually
def load_env_vars():
    env_vars = {}
    try:
        with open('/app/.env', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value
    except Exception as e:
        print(f"Error loading .env file: {e}")
    return env_vars

env_vars = load_env_vars()

# Supabase configuration
SUPABASE_URL = env_vars.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_ANON_KEY = env_vars.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

def test_upload_to_nonexistent_bucket():
    """Test what happens when trying to upload to non-existent bucket"""
    print("🧪 Testing upload to non-existent 'issue-photos' bucket")
    
    # Simulate file upload
    storage_url = f"{SUPABASE_URL}/storage/v1/object/issue-photos/test-file.jpg"
    headers = {
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'image/jpeg'
    }
    
    # Create a small test file content
    test_file_content = b"fake image content for testing"
    
    try:
        response = requests.post(storage_url, headers=headers, data=test_file_content)
        
        print(f"Upload Response Status: {response.status_code}")
        print(f"Upload Response: {response.text}")
        
        if response.status_code == 404:
            print("✅ EXPECTED: Bucket not found error - this matches frontend error handling")
            return True
        elif response.status_code == 400:
            print("✅ EXPECTED: Bad request - bucket likely doesn't exist")
            return True
        else:
            print(f"❌ UNEXPECTED: Got status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Exception during upload test: {e}")
        return False

def test_public_url_generation():
    """Test public URL generation for non-existent bucket"""
    print("\n🧪 Testing public URL generation")
    
    test_filename = "test-file.jpg"
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/issue-photos/{test_filename}"
    
    print(f"Generated Public URL: {public_url}")
    
    try:
        response = requests.head(public_url)
        print(f"Public URL Response Status: {response.status_code}")
        
        if response.status_code == 404:
            print("✅ EXPECTED: Public URL returns 404 for non-existent bucket/file")
            return True
        else:
            print(f"❌ UNEXPECTED: Got status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Exception during public URL test: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Frontend Upload Simulation Tests")
    print("=" * 60)
    
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        print("❌ FAIL: Supabase configuration missing")
        exit(1)
    
    test1_result = test_upload_to_nonexistent_bucket()
    test2_result = test_public_url_generation()
    
    print("\n" + "=" * 60)
    if test1_result and test2_result:
        print("🎉 All simulation tests passed! Frontend error handling should work correctly.")
    else:
        print("⚠️  Some simulation tests failed.")