from pocketbase import PocketBase

from route_processor import config

pb = PocketBase(config.POCKETBASE_URL)
pb.admins.auth_with_password(config.POCKETBASE_SERVICE_EMAIL, config.POCKETBASE_SERVICE_PASSWORD)
