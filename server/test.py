import os

from supabase import create_client, Client



SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

route = supabase.from_("routes").select("*").eq("id", 'b5b4476d-3230-4feb-ad97-9003bf5a1636').execute()

print(route)

