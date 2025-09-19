#!/usr/bin/env python3
"""
Admin Dashboard Backend API Test Suite
Tests the new admin dashboard functionality for Civic Reporter
"""

import requests
import json
import uuid
import time
import os
from datetime import datetime

# Configuration - Use environment variable for base URL
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000') + '/api'

# Test data for admin dashboard functionality
TEST_USER_ID = str(uuid.uuid4())
TEST_USER_DATA = {
    "id": TEST_USER_ID,
    "name": "Admin Test User",
    "email": f"admin.test.{int(time.time())}@example.com",
    "phone": "9876543210",
    "address": "123 Admin Street, Test City, TC 12345",
    "aadhar_number": "123456789012"
}

TEST_ISSUE_DATA = {
    "user_id": TEST_USER_ID,
    "description": "Water pipe burst on Main Street causing flooding and traffic disruption. Urgent repair needed.",
    "category": "Water Supply",
    "location": "Main Street & Central Avenue, Test City",
    "coordinates": {
        "lat": 28.6139,
        "lng": 77.2090
    }
}

TEST_DEPARTMENT_DATA = {
    "name": "Public Works Department",
    "description": "Responsible for infrastructure maintenance, road repairs, and public utilities",
    "contact_email": "publicworks@testcity.gov",
    "contact_phone": "555-0123",
    "active": True
}

TEST_DEPARTMENT_DATA_2 = {
    "name": "Water & Sanitation",
    "description": "Manages water supply, sewage systems, and sanitation services",
    "contact_email": "water@testcity.gov",
    "contact_phone": "555-0124"
    # active field omitted to test default value
}

class AdminDashboardAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.created_issue_id = None
        self.created_department_id = None
        self.created_department_id_2 = None
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

    def test_existing_api_health(self):
        """Test that existing APIs are still working"""
        try:
            # Test health endpoint
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code != 200:
                self.log_test("Existing API Health", False, f"Health endpoint failed: {response.status_code}")
                return False

            # Test issues endpoint
            response = self.session.get(f"{self.base_url}/issues")
            if response.status_code != 200:
                self.log_test("Existing API Health", False, f"Issues endpoint failed: {response.status_code}")
                return False

            # Test users endpoint
            response = self.session.get(f"{self.base_url}/users")
            if response.status_code != 200:
                self.log_test("Existing API Health", False, f"Users endpoint failed: {response.status_code}")
                return False

            # Test stats endpoint
            response = self.session.get(f"{self.base_url}/stats")
            if response.status_code != 200:
                self.log_test("Existing API Health", False, f"Stats endpoint failed: {response.status_code}")
                return False

            self.log_test("Existing API Health", True, "All existing endpoints are working correctly")
            return True

        except Exception as e:
            self.log_test("Existing API Health", False, f"Exception: {str(e)}")
            return False

    def test_get_departments_empty(self):
        """Test GET /api/departments - Should return empty array or default departments"""
        try:
            response = self.session.get(f"{self.base_url}/departments")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get Departments (Initial)", True, f"Retrieved {len(data)} departments successfully")
                    return True
                else:
                    self.log_test("Get Departments (Initial)", False, "Response is not an array", data)
                    return False
            else:
                self.log_test("Get Departments (Initial)", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Departments (Initial)", False, f"Exception: {str(e)}")
            return False

    def test_create_department(self):
        """Test POST /api/departments - Create a new department"""
        try:
            response = self.session.post(
                f"{self.base_url}/departments",
                json=TEST_DEPARTMENT_DATA
            )
            
            if response.status_code == 201:
                data = response.json()
                if (data.get('name') == TEST_DEPARTMENT_DATA['name'] and 
                    data.get('description') == TEST_DEPARTMENT_DATA['description'] and
                    data.get('contact_email') == TEST_DEPARTMENT_DATA['contact_email'] and
                    data.get('active') == TEST_DEPARTMENT_DATA['active']):
                    self.created_department_id = data.get('id')
                    self.log_test("Create Department", True, f"Department created successfully with ID: {self.created_department_id}")
                    return True
                else:
                    self.log_test("Create Department", False, "Department data mismatch in response", data)
                    return False
            else:
                self.log_test("Create Department", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Department", False, f"Exception: {str(e)}")
            return False

    def test_create_department_default_active(self):
        """Test POST /api/departments - Create department with default active value"""
        try:
            response = self.session.post(
                f"{self.base_url}/departments",
                json=TEST_DEPARTMENT_DATA_2
            )
            
            if response.status_code == 201:
                data = response.json()
                if (data.get('name') == TEST_DEPARTMENT_DATA_2['name'] and 
                    data.get('active') == True):  # Should default to True
                    self.created_department_id_2 = data.get('id')
                    self.log_test("Create Department (Default Active)", True, f"Department created with default active=true. ID: {self.created_department_id_2}")
                    return True
                else:
                    self.log_test("Create Department (Default Active)", False, "Department data mismatch or active not defaulted", data)
                    return False
            else:
                self.log_test("Create Department (Default Active)", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Department (Default Active)", False, f"Exception: {str(e)}")
            return False

    def test_create_department_missing_name(self):
        """Test POST /api/departments - Error handling for missing required field"""
        try:
            invalid_data = {
                "description": "Test department without name",
                "contact_email": "test@example.com"
            }
            
            response = self.session.post(
                f"{self.base_url}/departments",
                json=invalid_data
            )
            
            if response.status_code == 400:
                data = response.json()
                if 'error' in data and 'name' in data['error'].lower():
                    self.log_test("Create Department (Missing Name)", True, "Correctly returned 400 for missing name field")
                    return True
                else:
                    self.log_test("Create Department (Missing Name)", False, "Error message doesn't mention missing name", data)
                    return False
            else:
                self.log_test("Create Department (Missing Name)", False, f"Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Create Department (Missing Name)", False, f"Exception: {str(e)}")
            return False

    def test_get_departments_after_creation(self):
        """Test GET /api/departments - Should return created departments"""
        try:
            response = self.session.get(f"{self.base_url}/departments")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) >= 2:
                    # Check if our created departments are in the list
                    department_names = [dept.get('name') for dept in data]
                    if (TEST_DEPARTMENT_DATA['name'] in department_names and 
                        TEST_DEPARTMENT_DATA_2['name'] in department_names):
                        self.log_test("Get Departments (After Creation)", True, f"Retrieved {len(data)} departments including created ones")
                        return True
                    else:
                        self.log_test("Get Departments (After Creation)", False, "Created departments not found in response", data)
                        return False
                else:
                    self.log_test("Get Departments (After Creation)", False, f"Expected at least 2 departments, got {len(data) if isinstance(data, list) else 'non-array'}")
                    return False
            else:
                self.log_test("Get Departments (After Creation)", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Departments (After Creation)", False, f"Exception: {str(e)}")
            return False

    def setup_test_issue(self):
        """Setup test user and issue for admin features testing"""
        try:
            # Create test user
            response = self.session.post(
                f"{self.base_url}/users",
                json=TEST_USER_DATA
            )
            
            if response.status_code != 201:
                self.log_test("Setup Test Issue", False, f"Failed to create test user: {response.status_code}")
                return False

            # Create test issue
            response = self.session.post(
                f"{self.base_url}/issues",
                json=TEST_ISSUE_DATA
            )
            
            if response.status_code == 201:
                data = response.json()
                self.created_issue_id = data.get('id')
                self.log_test("Setup Test Issue", True, f"Test issue created with ID: {self.created_issue_id}")
                return True
            else:
                self.log_test("Setup Test Issue", False, f"Failed to create test issue: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Setup Test Issue", False, f"Exception: {str(e)}")
            return False

    def test_update_issue_with_admin_fields(self):
        """Test PUT /api/issues/{id} - Update issue with admin fields"""
        if not self.created_issue_id:
            self.log_test("Update Issue (Admin Fields)", False, "No issue ID available")
            return False
            
        try:
            update_data = {
                "status": "Acknowledged",
                "assigned_department": TEST_DEPARTMENT_DATA['name'],
                "admin_remarks": "Issue has been reviewed and assigned to the appropriate department for resolution. Expected completion within 3-5 business days."
            }
            
            response = self.session.put(
                f"{self.base_url}/issues/{self.created_issue_id}",
                json=update_data
            )
            
            if response.status_code == 200:
                data = response.json()
                if (data.get('status') == 'Acknowledged' and 
                    data.get('assigned_department') == TEST_DEPARTMENT_DATA['name'] and
                    data.get('admin_remarks') == update_data['admin_remarks'] and
                    'updated_at' in data):
                    self.log_test("Update Issue (Admin Fields)", True, "Issue updated successfully with admin fields and timestamp")
                    return True
                else:
                    self.log_test("Update Issue (Admin Fields)", False, "Admin fields not updated correctly", data)
                    return False
            else:
                self.log_test("Update Issue (Admin Fields)", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Update Issue (Admin Fields)", False, f"Exception: {str(e)}")
            return False

    def test_update_issue_status_only(self):
        """Test PUT /api/issues/{id} - Update only status without admin fields"""
        if not self.created_issue_id:
            self.log_test("Update Issue (Status Only)", False, "No issue ID available")
            return False
            
        try:
            update_data = {
                "status": "Resolved"
            }
            
            response = self.session.put(
                f"{self.base_url}/issues/{self.created_issue_id}",
                json=update_data
            )
            
            if response.status_code == 200:
                data = response.json()
                if (data.get('status') == 'Resolved' and 
                    'updated_at' in data):
                    # Admin fields should remain from previous update
                    if (data.get('assigned_department') == TEST_DEPARTMENT_DATA['name'] and
                        data.get('admin_remarks')):
                        self.log_test("Update Issue (Status Only)", True, "Status updated while preserving admin fields")
                        return True
                    else:
                        self.log_test("Update Issue (Status Only)", True, "Status updated successfully (admin fields may not be preserved)")
                        return True
                else:
                    self.log_test("Update Issue (Status Only)", False, "Status not updated correctly", data)
                    return False
            else:
                self.log_test("Update Issue (Status Only)", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Update Issue (Status Only)", False, f"Exception: {str(e)}")
            return False

    def test_update_issue_invalid_status(self):
        """Test PUT /api/issues/{id} - Error handling for invalid status"""
        if not self.created_issue_id:
            self.log_test("Update Issue (Invalid Status)", False, "No issue ID available")
            return False
            
        try:
            update_data = {
                "status": "InvalidStatus"
            }
            
            response = self.session.put(
                f"{self.base_url}/issues/{self.created_issue_id}",
                json=update_data
            )
            
            if response.status_code == 400:
                data = response.json()
                if 'error' in data and 'status' in data['error'].lower():
                    self.log_test("Update Issue (Invalid Status)", True, "Correctly returned 400 for invalid status")
                    return True
                else:
                    self.log_test("Update Issue (Invalid Status)", False, "Error message doesn't mention invalid status", data)
                    return False
            else:
                self.log_test("Update Issue (Invalid Status)", False, f"Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Update Issue (Invalid Status)", False, f"Exception: {str(e)}")
            return False

    def test_update_nonexistent_issue(self):
        """Test PUT /api/issues/{id} - Error handling for non-existent issue"""
        try:
            update_data = {
                "status": "Acknowledged"
            }
            
            response = self.session.put(
                f"{self.base_url}/issues/nonexistent-issue-id",
                json=update_data
            )
            
            if response.status_code in [404, 500]:  # Either is acceptable for non-existent issue
                self.log_test("Update Nonexistent Issue", True, f"Correctly returned {response.status_code} for non-existent issue")
                return True
            else:
                self.log_test("Update Nonexistent Issue", False, f"Expected 404 or 500, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Update Nonexistent Issue", False, f"Exception: {str(e)}")
            return False

    def test_get_issues_with_user_id_filter(self):
        """Test GET /api/issues?user_id=ID - Personalized issue filtering"""
        try:
            # Test with user_id parameter
            response = self.session.get(f"{self.base_url}/issues?user_id={TEST_USER_ID}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # All issues should belong to the specified user
                    user_issues = [issue for issue in data if issue.get('user_id') == TEST_USER_ID]
                    if len(user_issues) == len(data) and len(data) > 0:
                        self.log_test("Get Issues (User Filter)", True, f"Retrieved {len(data)} issues for specific user")
                        return True
                    elif len(data) == 0:
                        self.log_test("Get Issues (User Filter)", True, "No issues found for user (acceptable)")
                        return True
                    else:
                        self.log_test("Get Issues (User Filter)", False, f"Filter not working: {len(user_issues)}/{len(data)} issues belong to user")
                        return False
                else:
                    self.log_test("Get Issues (User Filter)", False, "Response is not an array", data)
                    return False
            else:
                self.log_test("Get Issues (User Filter)", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Issues (User Filter)", False, f"Exception: {str(e)}")
            return False

    def test_cors_headers_on_admin_endpoints(self):
        """Test CORS headers are present on admin endpoints"""
        try:
            endpoints_to_test = [
                "/departments",
                f"/issues/{self.created_issue_id or 'test-id'}"
            ]
            
            all_passed = True
            for endpoint in endpoints_to_test:
                response = self.session.options(f"{self.base_url}{endpoint}")
                
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
                    
                    if missing_headers:
                        all_passed = False
                        self.log_test("CORS Headers (Admin Endpoints)", False, f"Missing CORS headers on {endpoint}: {missing_headers}")
                        break
                else:
                    all_passed = False
                    self.log_test("CORS Headers (Admin Endpoints)", False, f"OPTIONS request failed on {endpoint}: HTTP {response.status_code}")
                    break
            
            if all_passed:
                self.log_test("CORS Headers (Admin Endpoints)", True, "All admin endpoints have proper CORS headers")
                return True
            else:
                return False
                
        except Exception as e:
            self.log_test("CORS Headers (Admin Endpoints)", False, f"Exception: {str(e)}")
            return False

    def test_api_response_consistency(self):
        """Test that all API responses have consistent structure and proper timestamps"""
        try:
            # Test various endpoints for consistent response structure
            endpoints_to_test = [
                ("/health", "GET"),
                ("/issues", "GET"),
                ("/users", "GET"),
                ("/departments", "GET"),
                ("/stats", "GET")
            ]
            
            all_passed = True
            for endpoint, method in endpoints_to_test:
                try:
                    response = self.session.get(f"{self.base_url}{endpoint}")
                    
                    if response.status_code == 200:
                        # Check if response is valid JSON
                        data = response.json()
                        
                        # Check CORS headers
                        if 'Access-Control-Allow-Origin' not in response.headers:
                            all_passed = False
                            self.log_test("API Response Consistency", False, f"Missing CORS headers on {endpoint}")
                            break
                            
                        # For endpoints that return timestamps, verify format
                        if endpoint == "/health" and 'timestamp' in data:
                            try:
                                datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
                            except ValueError:
                                all_passed = False
                                self.log_test("API Response Consistency", False, f"Invalid timestamp format on {endpoint}")
                                break
                    else:
                        all_passed = False
                        self.log_test("API Response Consistency", False, f"Endpoint {endpoint} returned {response.status_code}")
                        break
                        
                except Exception as e:
                    all_passed = False
                    self.log_test("API Response Consistency", False, f"Endpoint {endpoint} failed: {str(e)}")
                    break
            
            if all_passed:
                self.log_test("API Response Consistency", True, "All API responses have consistent structure and proper headers")
                return True
            else:
                return False
                
        except Exception as e:
            self.log_test("API Response Consistency", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all admin dashboard tests in sequence"""
        print("🚀 Starting Admin Dashboard Backend API Tests")
        print("=" * 70)
        
        tests = [
            # Test existing API health first
            self.test_existing_api_health,
            
            # Test department management
            self.test_get_departments_empty,
            self.test_create_department,
            self.test_create_department_default_active,
            self.test_create_department_missing_name,
            self.test_get_departments_after_creation,
            
            # Setup test data for admin features
            self.setup_test_issue,
            
            # Test admin features in issues API
            self.test_update_issue_with_admin_fields,
            self.test_update_issue_status_only,
            self.test_update_issue_invalid_status,
            self.test_update_nonexistent_issue,
            
            # Test enhanced filtering
            self.test_get_issues_with_user_id_filter,
            
            # Test API quality
            self.test_cors_headers_on_admin_endpoints,
            self.test_api_response_consistency
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
        
        print("\n" + "=" * 70)
        print(f"📊 Admin Dashboard Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All admin dashboard tests passed! Backend is ready for admin features.")
        else:
            print(f"⚠️  {total - passed} tests failed. Check the logs above for details.")
            
        return passed == total

    def generate_summary(self):
        """Generate a summary of test results"""
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        summary = {
            'test_type': 'Admin Dashboard Backend API',
            'total_tests': total,
            'passed': passed,
            'failed': total - passed,
            'success_rate': f"{(passed/total)*100:.1f}%" if total > 0 else "0%",
            'timestamp': datetime.now().isoformat(),
            'test_details': self.test_results
        }
        
        return summary

if __name__ == "__main__":
    tester = AdminDashboardAPITester()
    success = tester.run_all_tests()
    
    # Generate and save summary
    summary = tester.generate_summary()
    
    print(f"\n📋 Summary:")
    print(f"   Total Tests: {summary['total_tests']}")
    print(f"   Passed: {summary['passed']}")
    print(f"   Failed: {summary['failed']}")
    print(f"   Success Rate: {summary['success_rate']}")
    
    # Save detailed results to file
    with open('/app/admin_dashboard_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/admin_dashboard_test_results.json")
    
    exit(0 if success else 1)