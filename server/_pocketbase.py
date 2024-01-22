from pocketbase import PocketBase

from server import config

pb = PocketBase(config.POCKETBASE_URL)
pb.admins.auth_with_password(config.POCKETBASE_SERVICE_EMAIL, config.POCKETBASE_SERVICE_PASSWORD)
