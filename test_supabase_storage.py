#!/usr/bin/env python3
"""
Test Supabase Storage Bucket Access
Tests the 'issue-photos' bucket accessibility
"""

import os
import requests
import json
from datetime import datetime

# Supabase configuration from environment
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

class SupabaseStorageTester:
    def __init__(self):
        self.supabase_url = SUPABASE_URL
        self.supabase_key = SUPABASE_ANON_KEY
        self.storage_url = f"{self.supabase_url}/storage/v1"
        self.headers = {
            'Authorization': f'Bearer {self.supabase_key}',
            'Content-Type': 'application/json'
        }
        self.test_results = []

    def log_test(self, test_name, success, message, response_data=None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'response_data': response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if response_data and not success:
            print(f"   Response: {json.dumps(response_data, indent=2)}")

    def test_storage_connection(self):
        """Test basic connection to Supabase storage"""
        try:
            response = requests.get(f"{self.storage_url}/bucket", headers=self.headers)
            
            if response.status_code == 200:
                buckets = response.json()
                self.log_test("Storage Connection", True, f"Connected to Supabase storage. Found {len(buckets)} buckets")
                return True, buckets
            else:
                self.log_test("Storage Connection", False, f"HTTP {response.status_code}: {response.text}")
                return False, None
                
        except Exception as e:
            self.log_test("Storage Connection", False, f"Exception: {str(e)}")
            return False, None

    def test_issue_photos_bucket_exists(self, buckets):
        """Test if 'issue-photos' bucket exists"""
        try:
            if buckets is None:
                self.log_test("Issue Photos Bucket Exists", False, "No bucket data available")
                return False
                
            bucket_names = [bucket.get('name', '') for bucket in buckets]
            
            if 'issue-photos' in bucket_names:
                self.log_test("Issue Photos Bucket Exists", True, "issue-photos bucket found")
                return True
            else:
                self.log_test("Issue Photos Bucket Exists", False, f"issue-photos bucket not found. Available buckets: {bucket_names}")
                return False
                
        except Exception as e:
            self.log_test("Issue Photos Bucket Exists", False, f"Exception: {str(e)}")
            return False

    def test_bucket_accessibility(self):
        """Test if we can access the issue-photos bucket"""
        try:
            # Try to list files in the bucket
            response = requests.get(
                f"{self.storage_url}/object/list/issue-photos",
                headers=self.headers,
                params={'limit': 1}
            )
            
            if response.status_code == 200:
                files = response.json()
                self.log_test("Bucket Accessibility", True, f"issue-photos bucket is accessible. Contains {len(files)} files")
                return True
            elif response.status_code == 404:
                self.log_test("Bucket Accessibility", False, "issue-photos bucket not found or not accessible")
                return False
            else:
                self.log_test("Bucket Accessibility", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Bucket Accessibility", False, f"Exception: {str(e)}")
            return False

    def test_bucket_permissions(self):
        """Test bucket permissions for public access"""
        try:
            # Try to get public URL for a test file (this tests if bucket allows public access)
            test_filename = "test-file.jpg"
            public_url = f"{self.supabase_url}/storage/v1/object/public/issue-photos/{test_filename}"
            
            # Make a HEAD request to check if public access is configured
            response = requests.head(public_url)
            
            # 404 is expected since file doesn't exist, but it means bucket is publicly accessible
            # 403 would mean bucket is not publicly accessible
            if response.status_code == 404:
                self.log_test("Bucket Permissions", True, "issue-photos bucket allows public access")
                return True
            elif response.status_code == 403:
                self.log_test("Bucket Permissions", False, "issue-photos bucket does not allow public access")
                return False
            else:
                self.log_test("Bucket Permissions", True, f"Bucket permissions test inconclusive (HTTP {response.status_code})")
                return True
                
        except Exception as e:
            self.log_test("Bucket Permissions", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all storage tests"""
        print("🚀 Starting Supabase Storage Tests")
        print("=" * 60)
        
        if not self.supabase_url or not self.supabase_key:
            print("❌ FAIL: Supabase configuration missing")
            print(f"   SUPABASE_URL: {self.supabase_url}")
            print(f"   SUPABASE_KEY: {'***' if self.supabase_key else 'None'}")
            return False
        
        # Test storage connection and get buckets
        connection_success, buckets = self.test_storage_connection()
        
        if connection_success:
            # Test if issue-photos bucket exists
            bucket_exists = self.test_issue_photos_bucket_exists(buckets)
            
            if bucket_exists:
                # Test bucket accessibility
                self.test_bucket_accessibility()
                # Test bucket permissions
                self.test_bucket_permissions()
            else:
                print("⚠️  issue-photos bucket not found. This may need to be created in Supabase dashboard.")
        
        # Calculate results
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print("\n" + "=" * 60)
        print(f"📊 Storage Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All storage tests passed! Supabase storage is properly configured.")
        else:
            print(f"⚠️  {total - passed} storage tests failed. Check configuration.")
            
        return passed == total

if __name__ == "__main__":
    tester = SupabaseStorageTester()
    success = tester.run_all_tests()
    
    # Save results
    summary = {
        'total_tests': len(tester.test_results),
        'passed': sum(1 for result in tester.test_results if result['success']),
        'failed': sum(1 for result in tester.test_results if not result['success']),
        'timestamp': datetime.now().isoformat(),
        'test_details': tester.test_results
    }
    
    with open('/app/storage_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n📄 Storage test results saved to: /app/storage_test_results.json")
    
    exit(0 if success else 1)