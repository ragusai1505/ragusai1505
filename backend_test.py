#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Cafe Ikigai
Tests all API endpoints including auth, menu, orders, and admin functionality
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class CafeIkigaiAPITester:
    def __init__(self, base_url: str = "https://brew-dash-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.user_token = None
        self.admin_token = None
        self.test_user_id = None
        self.test_menu_item_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append(f"{name}: {details}")

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    token: Optional[str] = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except Exception as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test basic API health"""
        success, data = self.make_request('GET', '/health')
        self.log_test("API Health Check", success and data.get('status') == 'healthy', 
                     f"Response: {data}")

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, data = self.make_request('GET', '/')
        self.log_test("Root Endpoint", success and 'Cafe Ikigai API' in str(data), 
                     f"Response: {data}")

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "test123456"
        }
        
        success, data = self.make_request('POST', '/auth/register', user_data)
        if success and 'access_token' in data:
            self.user_token = data['access_token']
            self.test_user_id = data['user']['id']
        
        self.log_test("User Registration", success and 'access_token' in data, 
                     f"Response: {data}")

    def test_user_login(self):
        """Test user login with test credentials"""
        login_data = {
            "email": "test@example.com",
            "password": "test123456"
        }
        
        success, data = self.make_request('POST', '/auth/login', login_data)
        if success and 'access_token' in data:
            self.user_token = data['access_token']
        
        self.log_test("User Login", success and 'access_token' in data, 
                     f"Response: {data}")

    def test_admin_login(self):
        """Test admin login"""
        admin_data = {
            "email": "admin@cafeikigai.com",
            "password": "admin123"
        }
        
        success, data = self.make_request('POST', '/auth/login', admin_data)
        if success and 'access_token' in data and data.get('user', {}).get('is_admin'):
            self.admin_token = data['access_token']
        
        self.log_test("Admin Login", success and data.get('user', {}).get('is_admin', False), 
                     f"Response: {data}")

    def test_get_user_profile(self):
        """Test getting user profile"""
        if not self.user_token:
            self.log_test("Get User Profile", False, "No user token available")
            return
            
        success, data = self.make_request('GET', '/auth/me', token=self.user_token)
        self.log_test("Get User Profile", success and 'email' in data, 
                     f"Response: {data}")

    def test_get_menu(self):
        """Test getting menu items"""
        success, data = self.make_request('GET', '/menu')
        self.log_test("Get Menu", success and isinstance(data, list) and len(data) > 0, 
                     f"Found {len(data) if isinstance(data, list) else 0} menu items")

    def test_get_categories(self):
        """Test getting menu categories"""
        success, data = self.make_request('GET', '/categories')
        self.log_test("Get Categories", success and isinstance(data, list) and len(data) > 0, 
                     f"Found {len(data) if isinstance(data, list) else 0} categories")

    def test_menu_filtering(self):
        """Test menu filtering by category"""
        success, data = self.make_request('GET', '/menu?category=Lattes')
        filtered_items = [item for item in data if item.get('category') == 'Lattes'] if isinstance(data, list) else []
        self.log_test("Menu Category Filtering", success and len(filtered_items) > 0, 
                     f"Found {len(filtered_items)} Latte items")

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        if not self.admin_token:
            self.log_test("Admin Stats", False, "No admin token available")
            return
            
        success, data = self.make_request('GET', '/admin/stats', token=self.admin_token)
        required_fields = ['total_orders', 'total_revenue', 'total_users', 'total_menu_items']
        has_all_fields = all(field in data for field in required_fields) if isinstance(data, dict) else False
        
        self.log_test("Admin Stats", success and has_all_fields, 
                     f"Stats: {data}")

    def test_admin_get_all_menu(self):
        """Test admin get all menu items"""
        if not self.admin_token:
            self.log_test("Admin Get All Menu", False, "No admin token available")
            return
            
        success, data = self.make_request('GET', '/menu/all', token=self.admin_token)
        self.log_test("Admin Get All Menu", success and isinstance(data, list), 
                     f"Found {len(data) if isinstance(data, list) else 0} total menu items")

    def test_admin_get_orders(self):
        """Test admin get all orders"""
        if not self.admin_token:
            self.log_test("Admin Get Orders", False, "No admin token available")
            return
            
        success, data = self.make_request('GET', '/admin/orders', token=self.admin_token)
        self.log_test("Admin Get Orders", success and isinstance(data, list), 
                     f"Found {len(data) if isinstance(data, list) else 0} orders")

    def test_create_menu_item(self):
        """Test creating a menu item (admin only)"""
        if not self.admin_token:
            self.log_test("Create Menu Item", False, "No admin token available")
            return
            
        menu_item = {
            "name": "Test Coffee",
            "description": "A test coffee item",
            "price": 199.0,
            "category": "Test",
            "image_url": "https://example.com/test.jpg",
            "is_available": True
        }
        
        success, data = self.make_request('POST', '/menu', menu_item, token=self.admin_token, expected_status=200)
        if success and 'id' in data:
            self.test_menu_item_id = data['id']
        
        self.log_test("Create Menu Item", success and 'id' in data, 
                     f"Created item: {data}")

    def test_update_menu_item(self):
        """Test updating a menu item"""
        if not self.admin_token or not self.test_menu_item_id:
            self.log_test("Update Menu Item", False, "No admin token or test item ID")
            return
            
        update_data = {
            "name": "Updated Test Coffee",
            "price": 249.0
        }
        
        success, data = self.make_request('PUT', f'/menu/{self.test_menu_item_id}', 
                                        update_data, token=self.admin_token)
        self.log_test("Update Menu Item", success and data.get('name') == 'Updated Test Coffee', 
                     f"Updated item: {data}")

    def test_delete_menu_item(self):
        """Test deleting a menu item"""
        if not self.admin_token or not self.test_menu_item_id:
            self.log_test("Delete Menu Item", False, "No admin token or test item ID")
            return
            
        success, data = self.make_request('DELETE', f'/menu/{self.test_menu_item_id}', 
                                        token=self.admin_token)
        self.log_test("Delete Menu Item", success and 'message' in data, 
                     f"Delete response: {data}")

    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        # Test admin endpoint without token
        success, data = self.make_request('GET', '/admin/stats', expected_status=401)
        self.log_test("Unauthorized Admin Access", not success, 
                     f"Correctly blocked: {data}")

        # Test user endpoint without token
        success, data = self.make_request('GET', '/auth/me', expected_status=401)
        self.log_test("Unauthorized User Access", not success, 
                     f"Correctly blocked: {data}")

    def test_seed_data(self):
        """Test seed data endpoint"""
        success, data = self.make_request('POST', '/seed')
        # Should return success even if already seeded
        self.log_test("Seed Data", success, f"Seed response: {data}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🧪 Starting Cafe Ikigai Backend API Tests")
        print("=" * 50)
        
        # Basic API tests
        self.test_health_check()
        self.test_root_endpoint()
        self.test_seed_data()
        
        # Authentication tests
        self.test_user_registration()
        self.test_user_login()
        self.test_admin_login()
        self.test_get_user_profile()
        
        # Menu tests
        self.test_get_menu()
        self.test_get_categories()
        self.test_menu_filtering()
        
        # Admin tests
        self.test_admin_stats()
        self.test_admin_get_all_menu()
        self.test_admin_get_orders()
        self.test_create_menu_item()
        self.test_update_menu_item()
        self.test_delete_menu_item()
        
        # Security tests
        self.test_unauthorized_access()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = CafeIkigaiAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())