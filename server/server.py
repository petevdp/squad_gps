import asyncio
import json
import os
import sys

from fastapi import FastAPI, Request
from supabase import create_client, Client

file_dir = os.path.dirname(__file__)
sys.path.append(file_dir)

from logger import log
import config

supabase: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

NUM_PARTS = 4
app = FastAPI()


process_video_lock = asyncio.Semaphore(1)

@app.post('/process')
async def process(request: Request):
    log.info("Received request")
    event = await request.json()
    if event is None:
        return {"error": "Invalid JSON data"}, 400

    if event["type"] != "INSERT":
        return {"error": "Invalid event type"}, 400

    async with process_video_lock:
        await begin_processing(event)

    return {"message": "Started processing"}, 202


async def begin_processing(data):
    video_path = None
    try:
        bytes = supabase.storage.from_("route_uploads").download(data["record"]["name"])
        route_upload_details_id = os.path.basename(data["record"]["name"]).split(".")[0]
        upload_details = supabase.from_("route_upload_details").select("*").eq("upload_id",
                                                                               route_upload_details_id).execute()
        if not upload_details.data:
            return {"error": "Route does not exist"}, 400

        upload_details = upload_details.data[0]

        route_details = supabase.from_("routes").select("*").eq("id", upload_details["route_id"]).single().execute().data

        video_path = os.path.join(config.DOWNLOADS_DIR, data["record"]["name"])
        os.makedirs(os.path.dirname(video_path), exist_ok=True)

        map_name = route_details["map_name"]
        ## write to file
        with open(video_path, "wb") as f:
            f.write(bytes)

        script_path = os.path.join(os.path.dirname(__file__), "process_video.py")

        tasks = []
        for i in range(NUM_PARTS):
            tasks.append(
                asyncio.create_subprocess_shell(
                    " ".join([script_path, map_name, video_path, str(NUM_PARTS), str(i)]),
                    stdout=asyncio.subprocess.PIPE
                ))

        procs = await asyncio.gather(*tasks)
        outputs = await asyncio.gather(*[proc.communicate() for proc in procs])
        decoded_outputs = [output[0].decode() for output in outputs]

        measurements = []
        # parse outputs as csv
        for output in decoded_outputs:
            for line in output.strip().split("\n")[1:]:
                line = line.strip()
                if not line:
                    continue
                x, y, time = line.split(',')
                measurements.append({"x": int(x), "y": int(y), "time": int(time)})

        log.info(f"extracted {len(measurements)} measurements ")
        supabase.from_("routes").update({"path": measurements}).eq("id", route_details["id"]).execute()
        supabase.from_("route_upload_details").update({"status": "success"}).eq("upload_id", route_upload_details_id).execute()


        log.info(f"Finished processing {video_path}")
    except Exception as e:
        log.error(e)
        supabase.from_("route_upload_details").update({"status": "error"}).eq("upload_id", route_upload_details_id).execute()
    finally:
        if video_path is not None:
            os.remove(video_path)
        supabase.storage.from_("route_uploads").remove([data["record"]["name"]])
