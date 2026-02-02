#!/usr/bin/env python3
"""
Test script to diagnose chunk upload 400 errors
"""
import requests
import json

# Start a recording session first
print("1. Starting recording session...")
response = requests.post('http://localhost:5001/api/recording/start')
print(f"   Status: {response.status_code}")
print(f"   Response: {response.json()}")

if response.status_code != 200:
    print("Failed to start session!")
    exit(1)

session_id = response.json()['sessionId']
print(f"   Session ID: {session_id}")

# Try to upload a chunk with minimal data
print("\n2. Testing chunk upload with minimal data...")
chunk_data = {
    "sessionId": session_id,
    "orderIndex": 1,
    "actionType": "click",
    "posX": 100,
    "posY": 200,
    "screenshotBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
}

print(f"   Sending data: {json.dumps({k: v if k != 'screenshotBase64' else '<base64>' for k, v in chunk_data.items()}, indent=2)}")

response = requests.post(
    'http://localhost:5001/api/recording/chunk',
    json=chunk_data,
    headers={'Content-Type': 'application/json'}
)

print(f"   Status: {response.status_code}")
print(f"   Response: {response.text}")

if response.status_code == 200:
    print("\n✅ Chunk upload successful!")
else:
    print(f"\n❌ Chunk upload failed with status {response.status_code}")
    try:
        error_data = response.json()
        print(f"   Error: {error_data.get('message', 'Unknown error')}")
    except:
        print(f"   Raw response: {response.text}")
