import asyncio
import json
import os
from fastapi import FastAPI, Request
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

NUM_PARTS = 4
app = FastAPI()


@app.post('/process')
async def process(request: Request):
    print("Received request")
    data = await request.json()
    if data is None:
        return {"error": "Invalid JSON data"}, 400

    # noinspection PyAsyncCall
    await begin_processing(data)

    return {"message": "JSON data received successfully"}, 202


async def begin_processing(data):
    bytes = supabase.storage.from_("route_uploads").download(data["record"]["name"])

    file_path = os.path.join("video_downloads", data["record"]["name"])
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    ## write to file
    with open(file_path, "wb") as f:
        f.write(bytes)

    tasks = []
    for i in range(NUM_PARTS):
        tasks.append(
            asyncio.create_subprocess_shell(" ".join(["./process_video.py", file_path, "Yehorivka", str(NUM_PARTS), str(i)]),
                                            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE))

    procs = await asyncio.gather(*tasks)
    outputs = await asyncio.gather(*[proc.communicate() for proc in procs])
    decoded_outputs = [output[0].decode() for output in outputs]

    with open("decoded_outputs.csv", "w") as f:
        f.write("\n".join(decoded_outputs))


    measurements = []
    # parse outputs as csv
    for output in decoded_outputs:
        for line in output.strip().split("\n")[1:]:
            line = line.strip()
            if not line:
                continue
            x, y, time = line.split(',')
            measurements.append({"x": int(x), "y": int(y), "time": int(time)})

    json.dump(measurements, open("measurements.json", "w"))


    route_id = os.path.basename(data["record"]["name"]).split(".")[0]
    response = supabase.from_("routes").update({"path": measurements}).eq("id", route_id).execute()

    # completed = await asyncio.gather(*tasks)
    # outputs = await asyncio.gather(process.communicate() for process in completed)
    print(decoded_outputs, measurements, response)
    # delete video
    os.remove(file_path)
    supabase.storage.from_("route_uploads").remove([data["record"]["name"]])

