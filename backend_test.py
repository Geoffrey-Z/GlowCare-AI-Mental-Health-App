#!/usr/bin/env python3
"""
GlowCare Backend API Testing Suite
Tests all backend endpoints comprehensively
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

# API Configuration
API_BASE_URL = "https://mindmate-ai-13.preview.emergentagent.com/api"

class GlowCareAPITester:
    def __init__(self):
        self.base_url = API_BASE_URL
        self.test_user_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> tuple:
        """Make HTTP request and return (success, response, error_msg)"""
        try:
            url = f"{self.base_url}{endpoint}"
            headers = {"Content-Type": "application/json"}
            
            if method.upper() == "GET":
                response = requests.get(url, params=params, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=30)
            else:
                return False, None, f"Unsupported method: {method}"
            
            # Check if response is successful
            if response.status_code >= 200 and response.status_code < 300:
                try:
                    return True, response.json(), None
                except json.JSONDecodeError:
                    return True, response.text, None
            else:
                return False, None, f"HTTP {response.status_code}: {response.text}"
                
        except requests.exceptions.Timeout:
            return False, None, "Request timeout (30s)"
        except requests.exceptions.ConnectionError:
            return False, None, "Connection error - API may be down"
        except Exception as e:
            return False, None, f"Request error: {str(e)}"
    
    def test_health_check(self):
        """Test 1: Health Check - GET /api/health - Verify Doubao model preference"""
        print("\n=== Testing Health Check ===")
        
        success, response, error = self.make_request("GET", "/health")
        
        if not success:
            self.log_test("Health Check", False, f"API connection failed: {error}")
            return False
            
        # Validate response structure
        if isinstance(response, dict):
            if "status" in response and "services" in response:
                ai_status = response.get("services", {}).get("ai", "unknown")
                db_status = response.get("services", {}).get("database", "unknown")
                preferred_model = response.get("services", {}).get("preferred_model", "unknown")
                
                # Check if preferred model shows doubao
                doubao_check = "doubao" in preferred_model.lower() if preferred_model != "unknown" else False
                
                details = f"Status: {response.get('status')}, AI: {ai_status}, DB: {db_status}, Preferred Model: {preferred_model}, Doubao: {'✓' if doubao_check else '✗'}"
                self.log_test("Health Check", True, details, response)
                
                # Additional check for Doubao preference
                if doubao_check:
                    self.log_test("Doubao Model Check", True, f"Preferred model correctly shows Doubao: {preferred_model}")
                else:
                    self.log_test("Doubao Model Check", False, f"Expected Doubao in preferred model, got: {preferred_model}")
                
                return True
            else:
                self.log_test("Health Check", False, "Invalid response structure", response)
                return False
        else:
            self.log_test("Health Check", False, "Non-JSON response", response)
            return False
    
    def test_user_management(self):
        """Test 2: User Management - Create and retrieve user"""
        print("\n=== Testing User Management ===")
        
        # Test user creation
        user_data = {
            "name": "Sarah Johnson",
            "email": "sarah.johnson@example.com"
        }
        
        success, response, error = self.make_request("POST", "/users", user_data)
        
        if not success:
            self.log_test("User Creation", False, f"Failed to create user: {error}")
            return False
            
        if not isinstance(response, dict) or "id" not in response:
            self.log_test("User Creation", False, "Invalid user creation response", response)
            return False
            
        self.test_user_id = response["id"]
        self.log_test("User Creation", True, f"Created user with ID: {self.test_user_id}", response)
        
        # Test user retrieval
        success, response, error = self.make_request("GET", f"/users/{self.test_user_id}")
        
        if not success:
            self.log_test("User Retrieval", False, f"Failed to retrieve user: {error}")
            return False
            
        if isinstance(response, dict) and response.get("id") == self.test_user_id:
            self.log_test("User Retrieval", True, f"Successfully retrieved user: {response.get('name')}", response)
            return True
        else:
            self.log_test("User Retrieval", False, "User data mismatch", response)
            return False
    
    def test_emotion_tracking(self):
        """Test 3: Emotion Tracking - Create and retrieve emotions"""
        print("\n=== Testing Emotion Tracking ===")
        
        if not self.test_user_id:
            self.log_test("Emotion Tracking", False, "No test user available")
            return False
        
        # Test emotion creation with AI analysis
        emotion_data = {
            "user_id": self.test_user_id,
            "text_input": "I'm feeling really anxious about my presentation tomorrow",
            "context": "Work presentation causing stress",
            "source": "manual"
        }
        
        success, response, error = self.make_request("POST", "/emotions", emotion_data)
        
        if not success:
            self.log_test("Emotion Creation", False, f"Failed to create emotion entry: {error}")
            return False
            
        if not isinstance(response, dict) or "id" not in response:
            self.log_test("Emotion Creation", False, "Invalid emotion creation response", response)
            return False
            
        # Validate AI analysis
        emotion_id = response["id"]
        detected_emotion = response.get("emotion", "unknown")
        intensity = response.get("intensity", 0)
        ai_analysis = response.get("ai_analysis")
        
        details = f"Detected: {detected_emotion}, Intensity: {intensity}, AI Analysis: {'Present' if ai_analysis else 'Missing'}"
        self.log_test("Emotion Creation", True, details, response)
        
        # Test emotion retrieval
        success, response, error = self.make_request("GET", f"/emotions/{self.test_user_id}")
        
        if not success:
            self.log_test("Emotion Retrieval", False, f"Failed to retrieve emotions: {error}")
            return False
            
        if isinstance(response, list) and len(response) > 0:
            self.log_test("Emotion Retrieval", True, f"Retrieved {len(response)} emotion entries", response)
            return True
        else:
            self.log_test("Emotion Retrieval", False, "No emotions found or invalid response", response)
            return False
    
    def test_conversation_analysis(self):
        """Test 4: Conversation Analysis with AI insights"""
        print("\n=== Testing Conversation Analysis ===")
        
        if not self.test_user_id:
            self.log_test("Conversation Analysis", False, "No test user available")
            return False
        
        conversation_data = {
            "user_id": self.test_user_id,
            "conversation_text": "My boss keeps criticizing me and I feel like I'm not good enough. Every meeting feels like an attack on my abilities."
        }
        
        success, response, error = self.make_request("POST", "/conversations/analyze", conversation_data)
        
        if not success:
            self.log_test("Conversation Analysis", False, f"Failed to analyze conversation: {error}")
            return False
            
        if not isinstance(response, dict):
            self.log_test("Conversation Analysis", False, "Invalid response format", response)
            return False
            
        # Validate analysis components
        analysis = response.get("analysis", {})
        support_suggestions = response.get("support_suggestions", [])
        crisis_level = response.get("crisis_level", -1)
        
        if analysis and isinstance(support_suggestions, list) and crisis_level >= 0:
            details = f"Crisis Level: {crisis_level}, Suggestions: {len(support_suggestions)}, Analysis: Present"
            self.log_test("Conversation Analysis", True, details, response)
            return True
        else:
            self.log_test("Conversation Analysis", False, "Missing analysis components", response)
            return False
    
    def test_crisis_support(self):
        """Test 5: Crisis Support - Different support types"""
        print("\n=== Testing Crisis Support ===")
        
        if not self.test_user_id:
            self.log_test("Crisis Support", False, "No test user available")
            return False
        
        # Test different support types
        support_types = [
            ("crisis", "I can't handle this anymore, everything feels overwhelming"),
            ("breathing", "I need help calming down"),
            ("cbt", "I keep having negative thoughts"),
            ("general", "I'm feeling down today")
        ]
        
        all_passed = True
        
        for support_type, context in support_types:
            support_data = {
                "user_id": self.test_user_id,
                "request_type": support_type,
                "context": context
            }
            
            success, response, error = self.make_request("POST", "/support/crisis", support_data)
            
            if not success:
                self.log_test(f"Crisis Support ({support_type})", False, f"Failed: {error}")
                all_passed = False
                continue
                
            if not isinstance(response, dict):
                self.log_test(f"Crisis Support ({support_type})", False, "Invalid response format", response)
                all_passed = False
                continue
            
            # Validate response based on type
            if support_type == "crisis":
                if "crisis_level" in response and "immediate_support" in response:
                    crisis_level = response.get("crisis_level", 0)
                    self.log_test(f"Crisis Support ({support_type})", True, f"Crisis level: {crisis_level}", response)
                else:
                    self.log_test(f"Crisis Support ({support_type})", False, "Missing crisis response fields", response)
                    all_passed = False
            elif support_type == "breathing":
                if "instructions" in response:
                    instructions_count = len(response.get("instructions", []))
                    self.log_test(f"Crisis Support ({support_type})", True, f"Breathing instructions: {instructions_count} steps", response)
                else:
                    self.log_test(f"Crisis Support ({support_type})", False, "Missing breathing instructions", response)
                    all_passed = False
            elif support_type == "cbt":
                if "steps" in response:
                    steps_count = len(response.get("steps", []))
                    self.log_test(f"Crisis Support ({support_type})", True, f"CBT steps: {steps_count}", response)
                else:
                    self.log_test(f"Crisis Support ({support_type})", False, "Missing CBT steps", response)
                    all_passed = False
            else:  # general
                self.log_test(f"Crisis Support ({support_type})", True, "General support provided", response)
        
        return all_passed
    
    def test_mood_reports(self):
        """Test 6: Mood Reports - Weekly and monthly reports"""
        print("\n=== Testing Mood Reports ===")
        
        if not self.test_user_id:
            self.log_test("Mood Reports", False, "No test user available")
            return False
        
        # Test weekly report
        success, response, error = self.make_request("GET", f"/reports/{self.test_user_id}/mood", params={"period": "week"})
        
        if not success:
            self.log_test("Weekly Mood Report", False, f"Failed: {error}")
            return False
        
        if isinstance(response, dict):
            if "message" in response and "No data available" in response["message"]:
                self.log_test("Weekly Mood Report", True, "No data available (expected for new user)", response)
            elif "summary" in response and "ai_insights" in response:
                summary = response.get("summary", {})
                total_entries = summary.get("total_entries", 0)
                self.log_test("Weekly Mood Report", True, f"Generated report with {total_entries} entries", response)
            else:
                self.log_test("Weekly Mood Report", False, "Invalid report structure", response)
                return False
        else:
            self.log_test("Weekly Mood Report", False, "Invalid response format", response)
            return False
        
        # Test monthly report
        success, response, error = self.make_request("GET", f"/reports/{self.test_user_id}/mood", params={"period": "month"})
        
        if not success:
            self.log_test("Monthly Mood Report", False, f"Failed: {error}")
            return False
        
        if isinstance(response, dict):
            if "message" in response and "No data available" in response["message"]:
                self.log_test("Monthly Mood Report", True, "No data available (expected for new user)", response)
                return True
            elif "summary" in response:
                self.log_test("Monthly Mood Report", True, "Generated monthly report", response)
                return True
            else:
                self.log_test("Monthly Mood Report", False, "Invalid report structure", response)
                return False
        else:
            self.log_test("Monthly Mood Report", False, "Invalid response format", response)
            return False
    
    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting GlowCare Backend API Tests")
        print(f"📡 API Base URL: {self.base_url}")
        print("=" * 60)
        
        # Run tests in priority order
        tests = [
            ("Health Check", self.test_health_check),
            ("User Management", self.test_user_management),
            ("Emotion Tracking", self.test_emotion_tracking),
            ("Conversation Analysis", self.test_conversation_analysis),
            ("Crisis Support", self.test_crisis_support),
            ("Mood Reports", self.test_mood_reports)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
            except Exception as e:
                self.log_test(test_name, False, f"Test exception: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['details']}")
        
        print(f"\n🎯 Overall Result: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests PASSED! Backend API is working correctly.")
            return True
        else:
            print(f"⚠️  {total - passed} tests FAILED. Backend needs attention.")
            return False

def main():
    """Main test execution"""
    tester = GlowCareAPITester()
    success = tester.run_all_tests()
    
    # Return exit code for CI/CD
    exit(0 if success else 1)

if __name__ == "__main__":
    main()