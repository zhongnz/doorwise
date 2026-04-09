import os
from google import genai
from dotenv import load_dotenv

load_dotenv("../.env")
API_KEY = os.getenv("GOOGLE_API_KEY")

client = genai.Client(api_key=API_KEY)

print("Listing models...")
try:
    for model in client.models.list():
        print(f"Model: {model.name}, Supported Actions: {model.supported_generation_methods}")
except Exception as e:
    print(f"Error listing models: {e}")
