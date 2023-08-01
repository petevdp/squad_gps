import os

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
LOGS_DIR = os.environ.get("LOGS_DIR")
MAPS_DIR = os.environ.get("MAPS_DIR")
DOWNLOADS_DIR = os.environ.get("DOWNLOADS_DIR")
DEBUG = os.environ.get("DEBUG") == "True"
SHARED_SECRET_KEY = os.environ.get("SHARED_SECRET_KEY")
NUM_PROCESSES = 4
