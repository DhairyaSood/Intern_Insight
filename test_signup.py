import requests
import json

url = "http://127.0.0.1:3001/api/auth/signup"
data = {
    "username": "newtestuser",
    "password": "password123"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
