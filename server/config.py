import os

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
MAPS_DIR = os.environ.get("MAPS_DIR") or "/maps"
DOWNLOADS_DIR = os.environ.get("DOWNLOADS_DIR") or "/downloads"
DEBUG = os.environ.get("DEBUG") == "True"
SHARED_SECRET_KEY = os.environ.get("SHARED_SECRET_KEY")
NUM_PROCESSES = 4
