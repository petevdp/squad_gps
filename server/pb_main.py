from pathlib import Path

from pocketbase import PocketBase
from pocketbase.services.realtime_service import MessageData

import config
from server.extract_route import extract_route_multiprocessing
from server.logger import log

pb = PocketBase(config.POCKETBASE_URL)

pb.admins.auth_with_password(config.POCKETBASE_SERVICE_EMAIL, config.POCKETBASE_SERVICE_PASSWORD)

routes = pb.collection('routes').get_full_list()

PB_STORAGE_DIR = Path("../pocketbase/pb_data/storage")


def handle_route_change(event: MessageData):
    if event.action == 'delete' or event.record.status != 'pending' or not event.record.video: return
    _log = log.bind(route_name=event.record.name)

    pb.collection('routes').update(event.record.id, {"status": "inProgress"})

    _log.info("Processing video")

    video_path = PB_STORAGE_DIR / event.record.collection_id / event.record.id / event.record.video
    measurements = extract_route_multiprocessing(event.record.id, event.record.map_name, str(video_path), log)
    _log.info(f"extracted {len(measurements)} measurements ")
    if len(measurements) > 0:
        _log.info(f"Successfully processed {event.record.id} with status 'success' Writing to db...")
        pb.collection('routes').update(event.record.id, {"path": measurements, "status": "success", "video": None})
    else:
        pb.collection('routes').update(event.record.id, {"status": "error", "video": None})


pb.collection('routes').subscribe(handle_route_change)

log.info('listening for route changes...')
