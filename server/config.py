import os

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
MAPS_DIR = os.path.join(os.path.dirname(__file__), "maps-fullsize")
SHARED_SECRET_KEY = os.environ.get("SHARED_SECRET_KEY")

if os.environ.get('NUM_PROCESSES'):
    NUM_PROCESSES = int(os.environ.get('NUM_PROCESSES'))
else:
    NUM_PROCESSES = 4

DEBUG = os.environ.get("DEBUG") == "True"

DOWNLOADS_DIR = "./downloads"
FRAMES_READ_PER_SECOND_OF_VIDEO = 1 / 3
