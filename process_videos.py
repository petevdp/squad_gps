import asyncio
import os


async def main():
    videos = []
    for root, dirs, files in os.walk("./videos"):
        for file in files:
            if file.endswith(".mp4"):
                videos.append(os.path.join(root, file))

    tasks = []
    for video_path in videos:
        tasks.append(asyncio.create_subprocess_exec("./process_video.py", video_path))


    await asyncio.gather(*tasks)


if __name__ == "__main__":
    asyncio.run(main())
