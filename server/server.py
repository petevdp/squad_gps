import asyncio
import os
import sys
import tempfile

from fastapi import FastAPI, Request, HTTPException
from supabase import create_client, Client

file_dir = os.path.dirname(__file__)
sys.path.append(file_dir)

from shared import ProcessVideoArgs
from logger import log
import config

supabase: Client = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)

app = FastAPI()


@app.post('/process_video')
async def process(request: Request):
    if request.headers.get("Authorization") != f'Bearer {config.SHARED_SECRET_KEY}':
        raise HTTPException(status_code=401, detail="Invalid auth token")
    log.info("Received request")
    event = await request.json()
    if event is None:
        raise HTTPException(status_code=400, detail="Invalid JSON data")

    if event["type"] != "INSERT" or event["record"]["bucket_id"] != "route_uploads":
        raise HTTPException(status_code=400, detail="Invalid event type")

    asyncio.create_task(begin_processing(event))

    return {"message": "Started processing"}, 202


process_video_lock = asyncio.Semaphore(1)


async def begin_processing(event):
    async with process_video_lock:
        with tempfile.TemporaryDirectory(prefix="squad_gps") as tempdir:
            await process_video(event, tempdir)
            pass


async def process_video(data, tempdir):
    _log = log.bind(remote_filepath=data["record"]["name"], tempdir=tempdir)
    _log.info("Processing video")

    video_path = None
    route_upload_details_id = None
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

        route_upload_details_id = os.path.basename(data["record"]["name"]).split(".")[0]
        upload_details = supabase.from_("route_upload_details").select("*").eq("upload_id",
                                                                               route_upload_details_id).execute()
        if not upload_details.data:
            raise HTTPException(status_code=404, detail="Upload details not found")

        upload_details = upload_details.data[0]
        _log = _log.bind(upload_details=upload_details)

        _log.info(f"getting route details for {upload_details['route_id']}")
        route_details = supabase.from_("routes").select("*").eq("id",
                                                                upload_details["route_id"]).single().execute().data

        video_path = os.path.join(config.DOWNLOADS_DIR, data["record"]["name"])
        _log.info(f"writing video to {video_path}")
        os.makedirs(os.path.dirname(video_path), exist_ok=True)
        map_name = route_details["map_name"]
        ## write to file
        with open(video_path, "wb") as f:
            f.write(bytes)

        script_path = os.path.join(os.path.dirname(__file__), "process_video.py")

        tasks = []
        outfiles = []
        for i in range(config.NUM_PROCESSES):
            filepath = os.path.join(tempdir, f"out_{i}.csv")
            _log.info(f"starting process {i}")
            sp_args = [script_path, *ProcessVideoArgs(map_name, video_path, str(i), filepath)]
            tasks.append(asyncio.create_subprocess_shell(" ".join(sp_args)))
            outfiles.append(filepath)

        procs = await asyncio.gather(*tasks)

        await asyncio.gather(*[proc.wait() for proc in procs])

        measurements = []
        # parse outputs as csv
        for outfile in outfiles:
            _log.info(f"reading output from {outfile}")
            with open(outfile, "r") as f:
                output = f.read()
                for line in output.strip().split("\n"):
                    line = line.strip()
                    if not line:
                        continue
                    x, y, time = line.split(',')
                    measurements.append({"x": int(x), "y": int(y), "time": int(time)})

        _log.info(f"extracted {len(measurements)} measurements ")
        if len(measurements) > 0:
            _log.error("no measurements found")
            supabase.from_("routes").update({"path": measurements}).eq("id", route_details["id"]).execute()
        status = "success" if len(measurements) > 0 else "error"

        _log.info(f"Finished processing {route_upload_details_id} with status {status}. Writing to db...")
        supabase.from_("route_upload_details").update({"status": "success" if len(measurements) > 0 else "error"}).eq(
            "upload_id", route_upload_details_id).execute()

    except Exception as e:
        log.exception(e)
        if route_upload_details_id:
            supabase.from_("route_upload_details").update({"status": "error"}).eq("upload_id",
                                                                                  route_upload_details_id).execute()
    finally:
        if video_path is not None:
            os.remove(video_path)
        supabase.storage.from_("route_uploads").remove([data["record"]["name"]])
