from supabase import Client, create_client

from server import config

supabase: Client = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)
