import requests
import json

url = "http://127.0.0.1:3001/api/auth/login"

# Test with kagstro (SHA-256 hash)
data = {
    "username": "kagstro",
    "password": "kagstro"  # Replace with actual password
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
    print(f"Response text: {response.text[:500]}")
