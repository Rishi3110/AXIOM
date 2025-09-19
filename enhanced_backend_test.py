#!/usr/bin/env python3
"""
Enhanced Civic Reporter Backend API Test Suite
Tests new features: Personalized Issues API, Overall Statistics API, and Enhanced Image Upload
"""

import requests
import json
import uuid
import time
import os
from datetime import datetime

# Configuration - Use environment variable for base URL
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000') + '/api'

class EnhancedCivicReporterAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_results = []
        self.test_users = []
        self.test_issues = []

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

    def setup_test_data(self):
        """Create multiple users and issues for testing personalized features"""
        print("\n🔧 Setting up test data...")
        
        # Create 3 test users
        for i in range(3):
            user_data = {
                "id": str(uuid.uuid4()),
                "name": f"Test User {i+1}",
                "email": f"testuser{i+1}.{int(time.time())}@example.com",
                "phone": f"987654321{i}",
                "address": f"{i+1}00 Test Street, Test City, TC 1234{i}",
                "aadhar_number": f"98765432109{i}"
            }
            
            try:
                response = self.session.post(f"{self.base_url}/users", json=user_data)
                if response.status_code == 201:
                    self.test_users.append(user_data)
                    print(f"   ✅ Created user: {user_data['name']} (ID: {user_data['id']})")
                else:
                    print(f"   ❌ Failed to create user {i+1}: {response.status_code}")
            except Exception as e:
                print(f"   ❌ Exception creating user {i+1}: {str(e)}")
        
        # Create multiple issues for each user with different statuses
        statuses = ['Submitted', 'Acknowledged', 'Resolved']
        categories = ['Pothole', 'Streetlight', 'Garbage', 'Water Supply', 'Traffic']
        
        for user_idx, user in enumerate(self.test_users):
            for issue_idx in range(2):  # 2 issues per user
                issue_data = {
                    "user_id": user["id"],
                    "description": f"Test issue {issue_idx+1} from {user['name']} - {categories[issue_idx % len(categories)]} problem requiring attention.",
                    "category": categories[issue_idx % len(categories)],
                    "location": f"Location {issue_idx+1} for {user['name']}, Test City",
                    "coordinates": {
                        "lat": 28.6139 + (user_idx * 0.001) + (issue_idx * 0.0001),
                        "lng": 77.2090 + (user_idx * 0.001) + (issue_idx * 0.0001)
                    }
                }
                
                # Add image_url to some issues
                if issue_idx % 2 == 0:
                    issue_data["image_url"] = f"https://example.com/test-image-{user_idx}-{issue_idx}.jpg"
                
                try:
                    response = self.session.post(f"{self.base_url}/issues", json=issue_data)
                    if response.status_code == 201:
                        created_issue = response.json()
                        self.test_issues.append(created_issue)
                        print(f"   ✅ Created issue: {created_issue['id']} for {user['name']}")
                        
                        # Update some issues to different statuses
                        if issue_idx < len(statuses):
                            status_update = {"status": statuses[issue_idx]}
                            update_response = self.session.put(
                                f"{self.base_url}/issues/{created_issue['id']}", 
                                json=status_update
                            )
                            if update_response.status_code == 200:
                                print(f"   ✅ Updated issue {created_issue['id']} status to {statuses[issue_idx]}")
                    else:
                        print(f"   ❌ Failed to create issue for {user['name']}: {response.status_code}")
                except Exception as e:
                    print(f"   ❌ Exception creating issue for {user['name']}: {str(e)}")
        
        print(f"✅ Test data setup complete: {len(self.test_users)} users, {len(self.test_issues)} issues")

    def test_personalized_issues_api(self):
        """Test that GET /api/issues can be filtered by user_id for personalized view"""
        if not self.test_users:
            self.log_test("Personalized Issues API", False, "No test users available")
            return False
        
        try:
            # Test 1: Check if there's a way to filter issues by user_id
            # First, let's see if query parameters work
            test_user = self.test_users[0]
            
            # Try different approaches for personalized issues
            test_approaches = [
                f"{self.base_url}/issues?user_id={test_user['id']}",  # Query parameter
                f"{self.base_url}/issues/user/{test_user['id']}",     # Path parameter
                f"{self.base_url}/users/{test_user['id']}/issues"    # Nested resource
            ]
            
            personalized_working = False
            working_approach = None
            
            for approach in test_approaches:
                try:
                    response = self.session.get(approach)
                    if response.status_code == 200:
                        data = response.json()
                        if isinstance(data, list):
                            # Check if all issues belong to the test user
                            user_issues = [issue for issue in data if issue.get('user_id') == test_user['id']]
                            if len(user_issues) == len(data) and len(data) > 0:
                                personalized_working = True
                                working_approach = approach
                                self.log_test("Personalized Issues API", True, f"Personalized issues working via: {approach}. Found {len(data)} issues for user.")
                                break
                except:
                    continue
            
            if not personalized_working:
                # Test if the main /api/issues endpoint returns all issues (not personalized)
                response = self.session.get(f"{self.base_url}/issues")
                if response.status_code == 200:
                    all_issues = response.json()
                    user_specific_issues = [issue for issue in all_issues if issue.get('user_id') == test_user['id']]
                    total_issues = len(all_issues)
                    user_issues_count = len(user_specific_issues)
                    
                    if total_issues > user_issues_count:
                        self.log_test("Personalized Issues API", False, f"GET /api/issues returns ALL issues ({total_issues}) instead of user-specific issues ({user_issues_count}). Personalization not implemented.")
                        return False
                    else:
                        self.log_test("Personalized Issues API", True, f"Issues appear to be filtered (found {user_issues_count} issues for user)")
                        return True
                else:
                    self.log_test("Personalized Issues API", False, f"Failed to fetch issues: {response.status_code}")
                    return False
            
            return personalized_working
            
        except Exception as e:
            self.log_test("Personalized Issues API", False, f"Exception: {str(e)}")
            return False

    def test_overall_statistics_api(self):
        """Test API endpoint for fetching overall community statistics"""
        try:
            # Try different possible endpoints for statistics
            stats_endpoints = [
                f"{self.base_url}/stats",
                f"{self.base_url}/statistics",
                f"{self.base_url}/issues/stats",
                f"{self.base_url}/community/stats",
                f"{self.base_url}/dashboard/stats"
            ]
            
            stats_working = False
            working_endpoint = None
            stats_data = None
            
            for endpoint in stats_endpoints:
                try:
                    response = self.session.get(endpoint)
                    if response.status_code == 200:
                        data = response.json()
                        # Check if it looks like statistics data
                        expected_fields = ['total', 'submitted', 'acknowledged', 'resolved', 'active', 'in_progress']
                        if any(field in data for field in expected_fields):
                            stats_working = True
                            working_endpoint = endpoint
                            stats_data = data
                            break
                except:
                    continue
            
            if stats_working:
                self.log_test("Overall Statistics API", True, f"Statistics API working at: {working_endpoint}. Data: {json.dumps(stats_data, indent=2)}")
                return True
            else:
                # If no dedicated stats endpoint, check if we can derive stats from /api/issues
                response = self.session.get(f"{self.base_url}/issues")
                if response.status_code == 200:
                    all_issues = response.json()
                    if isinstance(all_issues, list) and len(all_issues) > 0:
                        # Calculate statistics manually to verify data is available
                        total = len(all_issues)
                        submitted = len([i for i in all_issues if i.get('status') == 'Submitted'])
                        acknowledged = len([i for i in all_issues if i.get('status') == 'Acknowledged'])
                        resolved = len([i for i in all_issues if i.get('status') == 'Resolved'])
                        
                        manual_stats = {
                            'total': total,
                            'submitted': submitted,
                            'acknowledged': acknowledged,
                            'resolved': resolved
                        }
                        
                        self.log_test("Overall Statistics API", False, f"No dedicated statistics endpoint found. Manual calculation from /api/issues: {json.dumps(manual_stats, indent=2)}")
                        return False
                    else:
                        self.log_test("Overall Statistics API", False, "No issues data available for statistics calculation")
                        return False
                else:
                    self.log_test("Overall Statistics API", False, f"Failed to fetch issues for statistics: {response.status_code}")
                    return False
            
        except Exception as e:
            self.log_test("Overall Statistics API", False, f"Exception: {str(e)}")
            return False

    def test_enhanced_image_upload_support(self):
        """Test enhanced image upload functionality"""
        try:
            # Test 1: Create issue with image_url
            issue_with_image = {
                "user_id": self.test_users[0]["id"] if self.test_users else str(uuid.uuid4()),
                "description": "Test issue with image upload functionality - broken streetlight with exposed wiring",
                "category": "Streetlight",
                "location": "Test Location with Image, Test City",
                "coordinates": {"lat": 28.6139, "lng": 77.2090},
                "image_url": "https://example.com/enhanced-test-image.jpg"
            }
            
            response = self.session.post(f"{self.base_url}/issues", json=issue_with_image)
            
            if response.status_code == 201:
                created_issue = response.json()
                if created_issue.get('image_url') == issue_with_image['image_url']:
                    self.log_test("Enhanced Image Upload - Create with Image", True, f"Issue created with image URL: {created_issue.get('image_url')}")
                else:
                    self.log_test("Enhanced Image Upload - Create with Image", False, "Image URL not properly stored")
                    return False
            else:
                self.log_test("Enhanced Image Upload - Create with Image", False, f"Failed to create issue with image: {response.status_code}")
                return False
            
            # Test 2: Create issue without image_url (graceful fallback)
            issue_without_image = {
                "user_id": self.test_users[0]["id"] if self.test_users else str(uuid.uuid4()),
                "description": "Test issue without image - garbage accumulation",
                "category": "Garbage",
                "location": "Test Location without Image, Test City",
                "coordinates": {"lat": 28.6140, "lng": 77.2091}
                # No image_url field
            }
            
            response = self.session.post(f"{self.base_url}/issues", json=issue_without_image)
            
            if response.status_code == 201:
                created_issue = response.json()
                if created_issue.get('image_url') is None:
                    self.log_test("Enhanced Image Upload - Create without Image", True, "Issue created successfully without image (graceful fallback)")
                else:
                    self.log_test("Enhanced Image Upload - Create without Image", False, f"Unexpected image_url value: {created_issue.get('image_url')}")
                    return False
            else:
                self.log_test("Enhanced Image Upload - Create without Image", False, f"Failed to create issue without image: {response.status_code}")
                return False
            
            # Test 3: Verify image URL retrieval
            response = self.session.get(f"{self.base_url}/issues/{created_issue['id']}")
            if response.status_code == 200:
                retrieved_issue = response.json()
                if retrieved_issue.get('image_url') is None:
                    self.log_test("Enhanced Image Upload - Retrieval", True, "Image URL properly retrieved (None for issue without image)")
                    return True
                else:
                    self.log_test("Enhanced Image Upload - Retrieval", False, f"Unexpected image_url in retrieval: {retrieved_issue.get('image_url')}")
                    return False
            else:
                self.log_test("Enhanced Image Upload - Retrieval", False, f"Failed to retrieve issue: {response.status_code}")
                return False
            
        except Exception as e:
            self.log_test("Enhanced Image Upload Support", False, f"Exception: {str(e)}")
            return False

    def test_core_functionality_verification(self):
        """Verify all existing API endpoints still work correctly"""
        try:
            # Test all core endpoints
            core_tests = [
                ("Health Check", "GET", "/health", None, 200),
                ("Get All Issues", "GET", "/issues", None, 200),
                ("Get All Users", "GET", "/users", None, 200),
            ]
            
            all_passed = True
            for test_name, method, endpoint, data, expected_status in core_tests:
                try:
                    if method == "GET":
                        response = self.session.get(f"{self.base_url}{endpoint}")
                    elif method == "POST":
                        response = self.session.post(f"{self.base_url}{endpoint}", json=data)
                    
                    if response.status_code == expected_status:
                        self.log_test(f"Core Functionality - {test_name}", True, f"Endpoint working correctly: {response.status_code}")
                    else:
                        self.log_test(f"Core Functionality - {test_name}", False, f"Expected {expected_status}, got {response.status_code}")
                        all_passed = False
                        
                except Exception as e:
                    self.log_test(f"Core Functionality - {test_name}", False, f"Exception: {str(e)}")
                    all_passed = False
            
            return all_passed
            
        except Exception as e:
            self.log_test("Core Functionality Verification", False, f"Exception: {str(e)}")
            return False

    def test_user_authentication_and_profile_management(self):
        """Test user creation and profile management"""
        try:
            # Test user creation with all fields
            new_user = {
                "id": str(uuid.uuid4()),
                "name": "Profile Test User",
                "email": f"profiletest.{int(time.time())}@example.com",
                "phone": "9876543210",
                "address": "123 Profile Test Street, Test City, TC 12345",
                "aadhar_number": "123456789012"
            }
            
            response = self.session.post(f"{self.base_url}/users", json=new_user)
            
            if response.status_code == 201:
                created_user = response.json()
                if (created_user.get('id') == new_user['id'] and 
                    created_user.get('name') == new_user['name'] and
                    created_user.get('email') == new_user['email']):
                    self.log_test("User Profile Management", True, f"User profile created successfully: {created_user['name']}")
                    return True
                else:
                    self.log_test("User Profile Management", False, "User data mismatch in response")
                    return False
            else:
                self.log_test("User Profile Management", False, f"Failed to create user: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("User Profile Management", False, f"Exception: {str(e)}")
            return False

    def test_supabase_integration(self):
        """Test Supabase integration for data storage"""
        try:
            # Test data persistence by creating and retrieving data
            test_user = {
                "id": str(uuid.uuid4()),
                "name": "Supabase Test User",
                "email": f"supabasetest.{int(time.time())}@example.com",
                "phone": "9876543210"
            }
            
            # Create user
            response = self.session.post(f"{self.base_url}/users", json=test_user)
            if response.status_code != 201:
                self.log_test("Supabase Integration", False, f"Failed to create user in Supabase: {response.status_code}")
                return False
            
            # Create issue for the user
            test_issue = {
                "user_id": test_user["id"],
                "description": "Supabase integration test issue",
                "category": "Test",
                "location": "Supabase Test Location",
                "coordinates": {"lat": 28.6139, "lng": 77.2090}
            }
            
            response = self.session.post(f"{self.base_url}/issues", json=test_issue)
            if response.status_code != 201:
                self.log_test("Supabase Integration", False, f"Failed to create issue in Supabase: {response.status_code}")
                return False
            
            created_issue = response.json()
            
            # Retrieve issue with user data (test foreign key relationship)
            response = self.session.get(f"{self.base_url}/issues/{created_issue['id']}")
            if response.status_code == 200:
                retrieved_issue = response.json()
                user_data = retrieved_issue.get('users')
                if user_data and user_data.get('name') == test_user['name']:
                    self.log_test("Supabase Integration", True, "Supabase integration working correctly with foreign key relationships")
                    return True
                else:
                    self.log_test("Supabase Integration", True, "Supabase integration working (foreign key relationship not verified)")
                    return True
            else:
                self.log_test("Supabase Integration", False, f"Failed to retrieve issue from Supabase: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Supabase Integration", False, f"Exception: {str(e)}")
            return False

    def test_error_handling_edge_cases(self):
        """Test error handling for edge cases"""
        try:
            test_cases = [
                # Non-existent user_id
                ({
                    "user_id": "non-existent-user-id",
                    "description": "Test issue",
                    "category": "Test",
                    "location": "Test Location"
                }, "Non-existent user_id"),
                
                # Missing required fields
                ({
                    "description": "Test issue without user_id"
                }, "Missing required fields"),
                
                # Invalid status update
                (None, "Invalid status update")  # Will be handled separately
            ]
            
            all_passed = True
            
            # Test invalid issue creation
            for test_data, test_name in test_cases[:2]:
                try:
                    response = self.session.post(f"{self.base_url}/issues", json=test_data)
                    if response.status_code in [400, 500]:  # Expected error codes
                        continue
                    else:
                        self.log_test(f"Error Handling - {test_name}", False, f"Expected error, got {response.status_code}")
                        all_passed = False
                except Exception as e:
                    self.log_test(f"Error Handling - {test_name}", False, f"Exception: {str(e)}")
                    all_passed = False
            
            # Test invalid status update if we have test issues
            if self.test_issues:
                try:
                    invalid_status = {"status": "InvalidStatus"}
                    response = self.session.put(
                        f"{self.base_url}/issues/{self.test_issues[0]['id']}", 
                        json=invalid_status
                    )
                    if response.status_code == 400:
                        pass  # Expected
                    else:
                        self.log_test("Error Handling - Invalid Status", False, f"Expected 400, got {response.status_code}")
                        all_passed = False
                except Exception as e:
                    self.log_test("Error Handling - Invalid Status", False, f"Exception: {str(e)}")
                    all_passed = False
            
            if all_passed:
                self.log_test("Error Handling Edge Cases", True, "All error handling tests passed")
                return True
            else:
                return False
                
        except Exception as e:
            self.log_test("Error Handling Edge Cases", False, f"Exception: {str(e)}")
            return False

    def test_cors_headers_comprehensive(self):
        """Test CORS headers comprehensively"""
        try:
            # Test OPTIONS request
            response = self.session.options(f"{self.base_url}/issues")
            
            required_headers = [
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Headers'
            ]
            
            missing_headers = []
            for header in required_headers:
                if header not in response.headers:
                    missing_headers.append(header)
            
            if not missing_headers:
                self.log_test("CORS Headers Comprehensive", True, "All required CORS headers present")
                return True
            else:
                self.log_test("CORS Headers Comprehensive", False, f"Missing CORS headers: {missing_headers}")
                return False
                
        except Exception as e:
            self.log_test("CORS Headers Comprehensive", False, f"Exception: {str(e)}")
            return False

    def run_enhanced_tests(self):
        """Run all enhanced tests"""
        print("🚀 Starting Enhanced Civic Reporter Backend API Tests")
        print("=" * 70)
        
        # Setup test data first
        self.setup_test_data()
        
        # Define test sequence
        tests = [
            ("Core Functionality Verification", self.test_core_functionality_verification),
            ("User Authentication and Profile Management", self.test_user_authentication_and_profile_management),
            ("Supabase Integration", self.test_supabase_integration),
            ("Enhanced Image Upload Support", self.test_enhanced_image_upload_support),
            ("Personalized Issues API", self.test_personalized_issues_api),
            ("Overall Statistics API", self.test_overall_statistics_api),
            ("Error Handling Edge Cases", self.test_error_handling_edge_cases),
            ("CORS Headers Comprehensive", self.test_cors_headers_comprehensive)
        ]
        
        passed = 0
        total = len(tests)
        
        print(f"\n🧪 Running {total} enhanced test suites...")
        print("-" * 70)
        
        for test_name, test_func in tests:
            try:
                print(f"\n📋 {test_name}:")
                if test_func():
                    passed += 1
                time.sleep(0.5)  # Small delay between tests
            except Exception as e:
                print(f"❌ Test suite {test_name} failed with exception: {e}")
        
        print("\n" + "=" * 70)
        print(f"📊 Enhanced Test Results: {passed}/{total} test suites passed")
        
        if passed == total:
            print("🎉 All enhanced tests passed! New features are working correctly.")
        else:
            print(f"⚠️  {total - passed} test suites failed. Check the logs above for details.")
        
        return passed, total

    def generate_enhanced_summary(self):
        """Generate enhanced summary of test results"""
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        summary = {
            'total_tests': total,
            'passed': passed,
            'failed': total - passed,
            'success_rate': f"{(passed/total)*100:.1f}%" if total > 0 else "0%",
            'timestamp': datetime.now().isoformat(),
            'test_users_created': len(self.test_users),
            'test_issues_created': len(self.test_issues),
            'test_details': self.test_results
        }
        
        return summary

if __name__ == "__main__":
    tester = EnhancedCivicReporterAPITester()
    passed, total = tester.run_enhanced_tests()
    
    # Generate and save summary
    summary = tester.generate_enhanced_summary()
    
    print(f"\n📋 Enhanced Summary:")
    print(f"   Total Individual Tests: {summary['total_tests']}")
    print(f"   Passed: {summary['passed']}")
    print(f"   Failed: {summary['failed']}")
    print(f"   Success Rate: {summary['success_rate']}")
    print(f"   Test Users Created: {summary['test_users_created']}")
    print(f"   Test Issues Created: {summary['test_issues_created']}")
    
    # Save detailed results to file
    with open('/app/enhanced_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n📄 Enhanced test results saved to: /app/enhanced_test_results.json")
    
    exit(0 if passed == total else 1)