import asyncio
import os

from fastapi import FastAPI, Request, HTTPException, BackgroundTasks

from . import config
from ._supabase import supabase
from .extract_route import extract_route_multiprocessing
from .logger import log

app = FastAPI()

process_video_lock = asyncio.Semaphore(1)


@app.post('/process_video')
async def process(request: Request, background_tasks: BackgroundTasks):
    if request.headers.get("Authorization") != f'Bearer {config.SHARED_SECRET_KEY}':
        raise HTTPException(status_code=401, detail="Invalid auth token")
    log.info("Received request")
    event = await request.json()
    if event is None:
        raise HTTPException(status_code=400, detail="Invalid JSON data")

    if event["type"] != "INSERT" or event["record"]["bucket_id"] != "route_uploads":
        raise HTTPException(status_code=400, detail="Invalid event type")

    async def begin_processing(event):
        async with process_video_lock:
            try:
                await process_video(event)
            except Exception as e:
                route_id = os.path.basename(event["record"]["name"]).split(".")[0]
                supabase.from_("routes").update({"status": "failed"}).eq("id", route_id).execute()
                raise e

    background_tasks.add_task(begin_processing, event)

    return {"message": "Started processing"}, 202


async def process_video(data):
    _log = log.bind(remote_filepath=data["record"]["name"])
    _log.info("Processing video")

    video_path = None
    route_details = None
    try:
        # for some reason the download isn't completed by the time the webhook is called sometimes
        for i in range(20):
            try:
                _log.info(f"downloading video (attempt {i})")
                bytes = supabase.storage.from_("route_uploads").download(data["record"]["name"])
                break
            except Exception as e:
                _log.exception(e)
                _log.info(f"trying again in 1s")
                await asyncio.sleep(1)
        else:
            raise HTTPException(status_code=500, detail="Failed to download video")

        route_id = os.path.basename(data["record"]["name"]).split(".")[0]
        route_details = supabase.from_("routes").select("*").eq("id", route_id).execute()

        if not route_details.data:
            raise HTTPException(status_code=404, detail="Upload details not found")

        route_details = route_details.data[0]
        _log = _log.bind(upload_details=route_details)

        video_path = os.path.join("downloads", data["record"]["name"])
        _log.info(f"writing video to {video_path}")
        os.makedirs(os.path.dirname(video_path), exist_ok=True)
        map_name = route_details["map_name"]

        with open(video_path, "wb") as f:
            f.write(bytes)
        del bytes

        measurements = extract_route_multiprocessing(route_id, map_name, video_path, _log)

        _log.info(f"extracted {len(measurements)} measurements ")
        if len(measurements) > 0:
            _log.info(f"Successfully processed {route_id} with status 'success' Writing to db...")
            (supabase.from_("routes")
             .update({"path": measurements, "status": "success"})
             .eq("id", route_details["id"]).execute())
        else:
            cleanup_failure(route_details)

    except Exception as e:
        log.exception(e)
        if route_details:
            cleanup_failure(route_details)
    finally:
        if video_path is not None and os.path.exists(video_path):
            os.remove(video_path)
        supabase.storage.from_("route_uploads").remove([data["record"]["name"]])


def cleanup_failure(route_details):
    if route_details["path"] is not None:
        supabase.from_("routes").update({"status": "error"}).eq("id", route_details["id"]).execute()
    else:
        supabase.from_("routes").delete().eq("id", route_details["id"]).execute()
