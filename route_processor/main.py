import sys
from pathlib import Path

from pocketbase import PocketBase
from pocketbase.services.realtime_service import MessageData

## add current directory as package. needed for any entrypoint for this program
pwd = Path(__file__).parent
sys.path.append(str(pwd.parent))

import config
from route_processor.extract_route import extract_route_multiprocessing
from route_processor.logger import log

PB_STORAGE_DIR = Path("../pocketbase/pb_data/storage")
pb = PocketBase(config.POCKETBASE_URL)


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


if __name__ == '__main__':
    pb.admins.auth_with_password(config.POCKETBASE_SERVICE_EMAIL, config.POCKETBASE_SERVICE_PASSWORD)
    pb.collection('routes').subscribe(handle_route_change)
    log.info('listening for route changes...')

    # make sure this works before upgrading the pocketbase lib, we're depending on an internal impl. detail here
    pb.realtime.event_source._loop_thread.join()
