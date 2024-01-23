import os

from dotenv import load_dotenv

load_dotenv()

if os.environ.get('NUM_PROCESSES'):
    NUM_PROCESSES = int(os.environ.get('NUM_PROCESSES'))
else:
    NUM_PROCESSES = 4

DEBUG = os.environ.get("DEBUG") == "True"

FRAMES_READ_PER_SECOND_OF_VIDEO = 1 / 3

POCKETBASE_URL = os.environ.get("POCKETBASE_URL")
POCKETBASE_SERVICE_EMAIL = os.environ.get("POCKETBASE_SERVICE_EMAIL")
POCKETBASE_SERVICE_PASSWORD = os.environ.get("POCKETBASE_SERVICE_PASSWORD")
