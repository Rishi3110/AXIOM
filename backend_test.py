#!/usr/bin/env python3
"""
Civic Reporter Backend API Test Suite
Tests Supabase integration and all API endpoints
"""

import requests
import json
import uuid
import time
import io
import base64
from datetime import datetime

# Configuration - Use environment variable for base URL
import os
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000') + '/api'

# Test data
TEST_USER_ID = str(uuid.uuid4())
TEST_USER_DATA = {
    "id": TEST_USER_ID,
    "name": "Jane Smith",
    "email": f"jane.smith.{int(time.time())}@example.com",  # Unique email
    "phone": "9876543210",
    "address": "456 Oak Street, Test City, TC 12345",
    "aadhar_number": "987654321098"
}

TEST_ISSUE_DATA = {
    "user_id": TEST_USER_ID,
    "description": "Large pothole causing traffic issues on Main Street near the intersection with Oak Avenue. The pothole is approximately 2 feet wide and 6 inches deep.",
    "category": "Pothole",
    "location": "Main Street & Oak Avenue, Test City",
    "coordinates": {
        "lat": 28.6139,
        "lng": 77.2090
    }
}

TEST_ISSUE_WITH_IMAGE_DATA = {
    "user_id": TEST_USER_ID,
    "description": "Broken streetlight with exposed wiring creating safety hazard on Park Avenue near the bus stop. The light has been flickering for weeks and now completely dark.",
    "category": "Streetlight",
    "location": "Park Avenue Bus Stop, Test City",
    "coordinates": {
        "lat": 28.6129,
        "lng": 77.2295
    },
    "image_url": "https://example.com/test-image.jpg"  # This will be updated with actual Supabase URL
}

class CivicReporterAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.created_issue_id = None
        self.created_issue_with_image_id = None
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

    def test_root_endpoint(self):
        """Test GET /api/ - Health check and API info"""
        try:
            response = self.session.get(f"{self.base_url}/")
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'endpoints' in data:
                    self.log_test("Root Endpoint", True, f"API info retrieved successfully. Message: {data['message']}")
                    return True
                else:
                    self.log_test("Root Endpoint", False, "Response missing required fields", data)
                    return False
            else:
                self.log_test("Root Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Exception: {str(e)}")
            return False

    def test_health_endpoint(self):
        """Test GET /api/health - Health status"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'healthy' and 'timestamp' in data:
                    self.log_test("Health Endpoint", True, f"Health check passed. Status: {data['status']}")
                    return True
                else:
                    self.log_test("Health Endpoint", False, "Health check response invalid", data)
                    return False
            else:
                self.log_test("Health Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Health Endpoint", False, f"Exception: {str(e)}")
            return False

    def test_get_issues_empty(self):
        """Test GET /api/issues - Should return empty array initially"""
        try:
            response = self.session.get(f"{self.base_url}/issues")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get Issues (Empty)", True, f"Retrieved {len(data)} issues successfully")
                    return True
                else:
                    self.log_test("Get Issues (Empty)", False, "Response is not an array", data)
                    return False
            else:
                self.log_test("Get Issues (Empty)", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Issues (Empty)", False, f"Exception: {str(e)}")
            return False

    def test_get_users_empty(self):
        """Test GET /api/users - Should return empty array initially"""
        try:
            response = self.session.get(f"{self.base_url}/users")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get Users (Empty)", True, f"Retrieved {len(data)} users successfully")
                    return True
                else:
                    self.log_test("Get Users (Empty)", False, "Response is not an array", data)
                    return False
            else:
                self.log_test("Get Users (Empty)", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Users (Empty)", False, f"Exception: {str(e)}")
            return False

    def test_create_user(self):
        """Test POST /api/users - Create a test user profile"""
        try:
            response = self.session.post(
                f"{self.base_url}/users",
                json=TEST_USER_DATA
            )
            
            if response.status_code == 201:
                data = response.json()
                if data.get('id') == TEST_USER_ID and data.get('name') == TEST_USER_DATA['name']:
                    self.log_test("Create User", True, f"User created successfully with ID: {data['id']}")
                    return True
                else:
                    self.log_test("Create User", False, "User data mismatch in response", data)
                    return False
            else:
                self.log_test("Create User", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create User", False, f"Exception: {str(e)}")
            return False

    def test_create_issue(self):
        """Test POST /api/issues - Create a test issue"""
        try:
            response = self.session.post(
                f"{self.base_url}/issues",
                json=TEST_ISSUE_DATA
            )
            
            if response.status_code == 201:
                data = response.json()
                if data.get('user_id') == TEST_USER_ID and data.get('description') == TEST_ISSUE_DATA['description']:
                    self.created_issue_id = data.get('id')
                    self.log_test("Create Issue", True, f"Issue created successfully with ID: {self.created_issue_id}")
                    return True
                else:
                    self.log_test("Create Issue", False, "Issue data mismatch in response", data)
                    return False
            else:
                self.log_test("Create Issue", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Issue", False, f"Exception: {str(e)}")
            return False

    def test_get_specific_issue(self):
        """Test GET /api/issues/[issueId] - Fetch specific issue by ID"""
        if not self.created_issue_id:
            self.log_test("Get Specific Issue", False, "No issue ID available (create issue test failed)")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/issues/{self.created_issue_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('id') == self.created_issue_id and data.get('description') == TEST_ISSUE_DATA['description']:
                    # Check if user data is included via join
                    user_data = data.get('users')
                    if user_data and user_data.get('name') == TEST_USER_DATA['name']:
                        self.log_test("Get Specific Issue", True, f"Issue retrieved with user data. Status: {data.get('status')}")
                        return True
                    else:
                        self.log_test("Get Specific Issue", True, f"Issue retrieved successfully. Status: {data.get('status')}")
                        return True
                else:
                    self.log_test("Get Specific Issue", False, "Issue data mismatch", data)
                    return False
            else:
                self.log_test("Get Specific Issue", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Specific Issue", False, f"Exception: {str(e)}")
            return False

    def test_update_issue_status(self):
        """Test PUT /api/issues/[issueId] - Update issue status"""
        if not self.created_issue_id:
            self.log_test("Update Issue Status", False, "No issue ID available (create issue test failed)")
            return False
            
        try:
            update_data = {"status": "Acknowledged"}
            response = self.session.put(
                f"{self.base_url}/issues/{self.created_issue_id}",
                json=update_data
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'Acknowledged':
                    self.log_test("Update Issue Status", True, f"Issue status updated to: {data.get('status')}")
                    return True
                else:
                    self.log_test("Update Issue Status", False, "Status not updated correctly", data)
                    return False
            else:
                self.log_test("Update Issue Status", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Update Issue Status", False, f"Exception: {str(e)}")
            return False

    def test_cors_headers(self):
        """Test CORS headers are present"""
        try:
            response = self.session.options(f"{self.base_url}/")
            
            if response.status_code == 200:
                cors_headers = [
                    'Access-Control-Allow-Origin',
                    'Access-Control-Allow-Methods',
                    'Access-Control-Allow-Headers'
                ]
                
                missing_headers = []
                for header in cors_headers:
                    if header not in response.headers:
                        missing_headers.append(header)
                
                if not missing_headers:
                    self.log_test("CORS Headers", True, "All required CORS headers present")
                    return True
                else:
                    self.log_test("CORS Headers", False, f"Missing CORS headers: {missing_headers}")
                    return False
            else:
                self.log_test("CORS Headers", False, f"OPTIONS request failed: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("CORS Headers", False, f"Exception: {str(e)}")
            return False

    def test_error_handling(self):
        """Test error handling for invalid requests"""
        try:
            # Test invalid route
            response = self.session.get(f"{self.base_url}/invalid-route")
            if response.status_code == 404:
                self.log_test("Error Handling (404)", True, "Invalid route returns 404 correctly")
            else:
                self.log_test("Error Handling (404)", False, f"Expected 404, got {response.status_code}")
                
            # Test invalid issue ID
            response = self.session.get(f"{self.base_url}/issues/invalid-id")
            if response.status_code == 404:
                self.log_test("Error Handling (Invalid ID)", True, "Invalid issue ID returns 404 correctly")
            else:
                self.log_test("Error Handling (Invalid ID)", False, f"Expected 404, got {response.status_code}")
                
            # Test missing required fields for user creation
            response = self.session.post(f"{self.base_url}/users", json={"name": "Test"})
            if response.status_code == 400:
                self.log_test("Error Handling (Missing Fields)", True, "Missing required fields returns 400 correctly")
                return True
            else:
                self.log_test("Error Handling (Missing Fields)", False, f"Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Error Handling", False, f"Exception: {str(e)}")
            return False

    def test_create_issue_with_image(self):
        """Test POST /api/issues - Create issue with image URL"""
        try:
            response = self.session.post(
                f"{self.base_url}/issues",
                json=TEST_ISSUE_WITH_IMAGE_DATA
            )
            
            if response.status_code == 201:
                data = response.json()
                if (data.get('user_id') == TEST_USER_ID and 
                    data.get('description') == TEST_ISSUE_WITH_IMAGE_DATA['description'] and
                    data.get('image_url') == TEST_ISSUE_WITH_IMAGE_DATA['image_url']):
                    self.created_issue_with_image_id = data.get('id')
                    self.log_test("Create Issue with Image", True, f"Issue with image created successfully. ID: {self.created_issue_with_image_id}")
                    return True
                else:
                    self.log_test("Create Issue with Image", False, "Issue data mismatch in response", data)
                    return False
            else:
                self.log_test("Create Issue with Image", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Issue with Image", False, f"Exception: {str(e)}")
            return False

    def test_create_issue_without_image(self):
        """Test POST /api/issues - Create issue without image (graceful fallback)"""
        try:
            # Test data without image_url
            issue_data_no_image = {
                "user_id": TEST_USER_ID,
                "description": "Garbage accumulation near the community center entrance. Multiple bags left unattended for several days attracting stray animals.",
                "category": "Garbage",
                "location": "Community Center Entrance, Test City",
                "coordinates": {
                    "lat": 28.6139,
                    "lng": 77.2090
                }
                # No image_url field
            }
            
            response = self.session.post(
                f"{self.base_url}/issues",
                json=issue_data_no_image
            )
            
            if response.status_code == 201:
                data = response.json()
                if (data.get('user_id') == TEST_USER_ID and 
                    data.get('description') == issue_data_no_image['description'] and
                    data.get('image_url') is None):  # Should be None when no image
                    self.log_test("Create Issue without Image", True, f"Issue without image created successfully. ID: {data.get('id')}")
                    return True
                else:
                    self.log_test("Create Issue without Image", False, "Issue data mismatch in response", data)
                    return False
            else:
                self.log_test("Create Issue without Image", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Issue without Image", False, f"Exception: {str(e)}")
            return False

    def test_image_url_storage_and_retrieval(self):
        """Test that image URLs are properly stored and retrieved"""
        if not self.created_issue_with_image_id:
            self.log_test("Image URL Storage/Retrieval", False, "No issue with image ID available")
            return False
            
        try:
            # Fetch the issue and verify image URL is stored
            response = self.session.get(f"{self.base_url}/issues/{self.created_issue_with_image_id}")
            
            if response.status_code == 200:
                data = response.json()
                image_url = data.get('image_url')
                
                if image_url and image_url == TEST_ISSUE_WITH_IMAGE_DATA['image_url']:
                    self.log_test("Image URL Storage/Retrieval", True, f"Image URL properly stored and retrieved: {image_url}")
                    return True
                else:
                    self.log_test("Image URL Storage/Retrieval", False, f"Image URL mismatch. Expected: {TEST_ISSUE_WITH_IMAGE_DATA['image_url']}, Got: {image_url}")
                    return False
            else:
                self.log_test("Image URL Storage/Retrieval", False, f"Failed to fetch issue: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Image URL Storage/Retrieval", False, f"Exception: {str(e)}")
            return False

    def test_backward_compatibility(self):
        """Test that existing API endpoints still work after image upload changes"""
        try:
            # Test all existing endpoints are still functional
            endpoints_to_test = [
                ("/", "GET", None),
                ("/health", "GET", None),
                ("/issues", "GET", None),
                ("/users", "GET", None)
            ]
            
            all_passed = True
            for endpoint, method, data in endpoints_to_test:
                try:
                    if method == "GET":
                        response = self.session.get(f"{self.base_url}{endpoint}")
                    elif method == "POST":
                        response = self.session.post(f"{self.base_url}{endpoint}", json=data)
                    
                    if response.status_code not in [200, 201]:
                        all_passed = False
                        self.log_test("Backward Compatibility", False, f"Endpoint {endpoint} failed with status {response.status_code}")
                        break
                        
                except Exception as e:
                    all_passed = False
                    self.log_test("Backward Compatibility", False, f"Endpoint {endpoint} failed with exception: {str(e)}")
                    break
            
            if all_passed:
                self.log_test("Backward Compatibility", True, "All existing endpoints working correctly after image upload changes")
                return True
            else:
                return False
                
        except Exception as e:
            self.log_test("Backward Compatibility", False, f"Exception: {str(e)}")
            return False

    def test_enhanced_error_handling(self):
        """Test enhanced error handling for various scenarios"""
        try:
            test_cases = [
                # Test missing required fields
                ({}, 400, "Empty request body"),
                ({"description": "Test"}, 400, "Missing required fields"),
                ({"user_id": "invalid", "description": "Test", "category": "Test", "location": "Test"}, 500, "Invalid user_id"),
            ]
            
            all_passed = True
            for test_data, expected_status, test_name in test_cases:
                try:
                    response = self.session.post(f"{self.base_url}/issues", json=test_data)
                    
                    if response.status_code == expected_status:
                        continue  # This test case passed
                    else:
                        all_passed = False
                        self.log_test("Enhanced Error Handling", False, f"{test_name}: Expected {expected_status}, got {response.status_code}")
                        break
                        
                except Exception as e:
                    all_passed = False
                    self.log_test("Enhanced Error Handling", False, f"{test_name}: Exception {str(e)}")
                    break
            
            if all_passed:
                self.log_test("Enhanced Error Handling", True, "Error handling working correctly for various scenarios")
                return True
            else:
                return False
                
        except Exception as e:
            self.log_test("Enhanced Error Handling", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Civic Reporter Backend API Tests")
        print("=" * 60)
        
        tests = [
            self.test_root_endpoint,
            self.test_health_endpoint,
            self.test_get_issues_empty,
            self.test_get_users_empty,
            self.test_create_user,
            self.test_create_issue,
            self.test_create_issue_with_image,
            self.test_create_issue_without_image,
            self.test_get_specific_issue,
            self.test_update_issue_status,
            self.test_image_url_storage_and_retrieval,
            self.test_backward_compatibility,
            self.test_enhanced_error_handling,
            self.test_cors_headers,
            self.test_error_handling
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
                time.sleep(0.5)  # Small delay between tests
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
        
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Supabase integration is working correctly.")
        else:
            print(f"⚠️  {total - passed} tests failed. Check the logs above for details.")
            
        return passed == total

    def generate_summary(self):
        """Generate a summary of test results"""
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        summary = {
            'total_tests': total,
            'passed': passed,
            'failed': total - passed,
            'success_rate': f"{(passed/total)*100:.1f}%" if total > 0 else "0%",
            'timestamp': datetime.now().isoformat(),
            'test_details': self.test_results
        }
        
        return summary

if __name__ == "__main__":
    tester = CivicReporterAPITester()
    success = tester.run_all_tests()
    
    # Generate and save summary
    summary = tester.generate_summary()
    
    print(f"\n📋 Summary:")
    print(f"   Total Tests: {summary['total_tests']}")
    print(f"   Passed: {summary['passed']}")
    print(f"   Failed: {summary['failed']}")
    print(f"   Success Rate: {summary['success_rate']}")
    
    # Save detailed results to file
    with open('/app/test_results_detailed.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/test_results_detailed.json")
    
    exit(0 if success else 1)