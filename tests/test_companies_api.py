"""
Quick test to verify company API endpoints are working
"""

import requests
import json

BASE_URL = "http://127.0.0.1:5000/api"

def test_companies_endpoints():
    """Test all company API endpoints"""
    
    print("="*60)
    print("Testing Company API Endpoints")
    print("="*60)
    
    # Test 1: Get all companies
    print("\n[1] Testing GET /api/companies")
    try:
        response = requests.get(f"{BASE_URL}/companies")
        data = response.json()
        print(f"✓ Status: {response.status_code}")
        print(f"✓ Total companies: {data['data']['total']}")
        print(f"✓ Companies returned: {len(data['data']['companies'])}")
        if data['data']['companies']:
            print(f"✓ Sample: {data['data']['companies'][0]['name']}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 2: Get companies with filters
    print("\n[2] Testing GET /api/companies with filters (sector=Technology, is_hiring=true)")
    try:
        response = requests.get(f"{BASE_URL}/companies", params={
            'sector': 'Technology',
            'is_hiring': 'true',
            'sort_by': 'rating',
            'order': 'desc'
        })
        data = response.json()
        print(f"✓ Status: {response.status_code}")
        print(f"✓ Filtered companies: {len(data['data']['companies'])}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 3: Get specific company by ID
    print("\n[3] Testing GET /api/companies/COMP_001")
    try:
        response = requests.get(f"{BASE_URL}/companies/COMP_001")
        data = response.json()
        print(f"✓ Status: {response.status_code}")
        print(f"✓ Company: {data['data']['name']}")
        print(f"✓ Internships: {len(data['data'].get('internships', []))}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 4: Get company by name
    print("\n[4] Testing GET /api/companies/by-name/Google India")
    try:
        response = requests.get(f"{BASE_URL}/companies/by-name/Google India")
        data = response.json()
        print(f"✓ Status: {response.status_code}")
        print(f"✓ Company: {data['data']['name']}")
        print(f"✓ Sector: {data['data']['sector']}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 5: Get sectors
    print("\n[5] Testing GET /api/companies/sectors")
    try:
        response = requests.get(f"{BASE_URL}/companies/sectors")
        data = response.json()
        print(f"✓ Status: {response.status_code}")
        print(f"✓ Total sectors: {len(data['data'])}")
        print(f"✓ Top 3 sectors:")
        for sector in data['data'][:3]:
            print(f"   - {sector['sector']}: {sector['count']} companies")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 6: Get company stats
    print("\n[6] Testing GET /api/companies/stats")
    try:
        response = requests.get(f"{BASE_URL}/companies/stats")
        data = response.json()
        print(f"✓ Status: {response.status_code}")
        print(f"✓ Total companies: {data['data']['total_companies']}")
        print(f"✓ Hiring companies: {data['data']['hiring_companies']}")
        print(f"✓ Total internships: {data['data']['total_internships']}")
        print(f"✓ Average rating: {data['data']['average_rating']}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print("\n" + "="*60)
    print("✓ All tests completed!")
    print("="*60)

if __name__ == "__main__":
    test_companies_endpoints()
