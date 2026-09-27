import os
from google import genai

api_key = os.environ.get("GEMINI_API_KEY", "")

try:
    client = genai.Client(api_key=api_key)
    for m in client.models.list():
        print(m.name)
except Exception as e:
    print("Error:", str(e))
