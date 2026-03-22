#!/usr/bin/env python3
"""
Focused testing for Admin Management System features
Tests specific APIs mentioned in the testing request
"""

import requests
import sys
import json
from datetime import datetime

class AdminFeaturesAPITester:
    def __init__(self, base_url: str = "https://brew-dash-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.user_token = None
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

    def make_request(self, method: str, endpoint: str, data=None, token=None, expected_status: int = 200):
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

    def setup_admin_auth(self):
        """Login as admin to get token"""
        admin_data = {
            "email": "admin@cafeikigai.com",
            "password": "admin123"
        }
        
        success, data = self.make_request('POST', '/auth/login', admin_data)
        if success and 'access_token' in data and data.get('user', {}).get('is_admin'):
            self.admin_token = data['access_token']
            return True
        return False

    def setup_user_auth(self):
        """Register and login as regular user"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "test123456"
        }
        
        success, data = self.make_request('POST', '/auth/register', user_data)
        if success and 'access_token' in data:
            self.user_token = data['access_token']
            return True
        return False

    def test_inventory_api(self):
        """Test GET /api/inventory returns inventory items"""
        if not self.admin_token:
            self.log_test("GET /api/inventory", False, "No admin token available")
            return
            
        success, data = self.make_request('GET', '/inventory', token=self.admin_token)
        is_valid = success and isinstance(data, list)
        
        self.log_test("GET /api/inventory", is_valid, 
                     f"Found {len(data) if isinstance(data, list) else 0} inventory items")

    def test_expenses_api(self):
        """Test GET /api/expenses returns expenses"""
        if not self.admin_token:
            self.log_test("GET /api/expenses", False, "No admin token available")
            return
            
        success, data = self.make_request('GET', '/expenses', token=self.admin_token)
        is_valid = success and isinstance(data, dict) and 'expenses' in data
        
        expense_count = len(data.get('expenses', [])) if isinstance(data, dict) else 0
        self.log_test("GET /api/expenses", is_valid, 
                     f"Found {expense_count} expenses, total: ₹{data.get('total', 0) if isinstance(data, dict) else 0}")

    def test_sales_report_api(self):
        """Test GET /api/admin/reports/sales returns sales report"""
        if not self.admin_token:
            self.log_test("GET /api/admin/reports/sales", False, "No admin token available")
            return
            
        success, data = self.make_request('GET', '/admin/reports/sales', token=self.admin_token)
        required_fields = ['total_revenue', 'total_orders', 'average_order_value', 'top_products']
        is_valid = success and isinstance(data, dict) and all(field in data for field in required_fields)
        
        self.log_test("GET /api/admin/reports/sales", is_valid, 
                     f"Revenue: ₹{data.get('total_revenue', 0)}, Orders: {data.get('total_orders', 0)}")

    def test_financial_report_api(self):
        """Test GET /api/admin/reports/financial returns financial report"""
        if not self.admin_token:
            self.log_test("GET /api/admin/reports/financial", False, "No admin token available")
            return
            
        success, data = self.make_request('GET', '/admin/reports/financial', token=self.admin_token)
        required_fields = ['revenue', 'expenses', 'net_profit', 'profit_margin']
        is_valid = success and isinstance(data, dict) and all(field in data for field in required_fields)
        
        self.log_test("GET /api/admin/reports/financial", is_valid, 
                     f"Revenue: ₹{data.get('revenue', 0)}, Profit: ₹{data.get('net_profit', 0)}")

    def test_loyalty_points_api(self):
        """Test GET /api/loyalty/my-points returns loyalty data for logged-in user"""
        if not self.user_token:
            self.log_test("GET /api/loyalty/my-points", False, "No user token available")
            return
            
        success, data = self.make_request('GET', '/loyalty/my-points', token=self.user_token)
        required_fields = ['points', 'lifetime_points', 'tier', 'points_value']
        is_valid = success and isinstance(data, dict) and all(field in data for field in required_fields)
        
        self.log_test("GET /api/loyalty/my-points", is_valid, 
                     f"Points: {data.get('points', 0)}, Tier: {data.get('tier', 'unknown')}")

    def test_admin_dashboard_overview_stats(self):
        """Test admin dashboard overview stats including low stock count"""
        if not self.admin_token:
            self.log_test("Admin Dashboard Overview Stats", False, "No admin token available")
            return
            
        success, data = self.make_request('GET', '/admin/stats', token=self.admin_token)
        required_fields = ['total_orders', 'total_revenue', 'low_stock_count']
        is_valid = success and isinstance(data, dict) and all(field in data for field in required_fields)
        
        self.log_test("Admin Dashboard Overview Stats", is_valid, 
                     f"Orders: {data.get('total_orders', 0)}, Low Stock: {data.get('low_stock_count', 0)}")

    def test_low_stock_items(self):
        """Test low stock items endpoint"""
        if not self.admin_token:
            self.log_test("Low Stock Items", False, "No admin token available")
            return
            
        success, data = self.make_request('GET', '/inventory/low-stock', token=self.admin_token)
        is_valid = success and isinstance(data, dict) and 'count' in data and 'items' in data
        
        self.log_test("Low Stock Items", is_valid, 
                     f"Low stock count: {data.get('count', 0)}")

    def run_all_tests(self):
        """Run all admin features tests"""
        print("🧪 Starting Admin Management System API Tests")
        print("=" * 60)
        
        # Setup authentication
        print("Setting up authentication...")
        admin_auth = self.setup_admin_auth()
        user_auth = self.setup_user_auth()
        
        if not admin_auth:
            print("❌ Failed to authenticate as admin")
            return False
        if not user_auth:
            print("❌ Failed to authenticate as user")
            return False
            
        print("✅ Authentication setup complete\n")
        
        # Test specific APIs mentioned in testing request
        self.test_inventory_api()
        self.test_expenses_api()
        self.test_sales_report_api()
        self.test_financial_report_api()
        self.test_loyalty_points_api()
        
        # Test additional admin features
        self.test_admin_dashboard_overview_stats()
        self.test_low_stock_items()
        
        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Admin Features Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        else:
            print("\n🎉 All admin features are working correctly!")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = AdminFeaturesAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())