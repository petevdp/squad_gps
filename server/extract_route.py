#!/usr/bin/env python

import cv2
import math
import multiprocessing as mp
import structlog
from typing import NamedTuple

from . import config
from . import detect_car as dc
from . import extract_map_data
from ._supabase import supabase
from .logger import log


class ExtractRouteArgs(NamedTuple):
    map_name: str
    video_path: str
    log: structlog.BoundLogger
    segment_idx: int = 0


def process_to_outputs(args: ExtractRouteArgs, minimap_bounding_box, outputs, progress_out):
    def increment_progress(inc_amount):
        progress_out.send(inc_amount)

    outputs[args.segment_idx] = extract_route(args, minimap_bounding_box, increment_progress)


def report_progress(progress_updates, route_id):
    _log = log.bind(route_id=route_id)
    progress = 0
    while (inc := progress_updates.recv()) is not None:
        progress += inc
        _log.info("Updating Progress", progress=progress)
        supabase.from_("routes").update({"progress": progress, "status": "inProgress"}).eq("id", route_id).execute()
    _log.info("Finished reporting progress")


def extract_route_multiprocessing(route_id, map_name, video_path, _log):
    _log = log.bind(map_name=map_name, video_path=video_path)
    mgr = mp.Manager()
    minimap_bounding_box = mgr.list([None] * 4)
    outputs = mgr.list([None] * config.NUM_PROCESSES)
    progress_out, progress_in = mp.Pipe()
    report_progress_process = mp.Process(target=report_progress, args=(progress_out, route_id))
    report_progress_process.start()

    processes = [
        mp.Process(target=process_to_outputs,
                   args=(ExtractRouteArgs(map_name, video_path, _log, idx), minimap_bounding_box, outputs, progress_in))
        for idx in range(config.NUM_PROCESSES)]

    for i, p in enumerate(processes):
        _log.info(f"starting process {i}")
        p.start()
    for p in processes:
        p.join()
        p.close()

    _log.info(f"finished processing video")
    progress_in.send(None)
    progress_in.close()
    progress_out.close()
    report_progress_process.join()
    _log.info(f"finished reporting progress")
    report_progress_process.close()
    measurements = [r for s in outputs[:] for r in s]
    return measurements


def extract_route(args: ExtractRouteArgs, bounding_box, inc_progress):
    _log = args.log.bind(segment_idx=args.segment_idx)
    _log.info("processing %s", args.map_name)

    # we can't pickle keypoints so we do this here inside of each process. it's not that expensive anyway
    map_keypoints, map_descriptors = extract_map_data.read_keypoints_and_descriptors(args.map_name)
    cap = cv2.VideoCapture(args.video_path)

    # if config.DEBUG:
    #     map_annotated = map.copy()
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    segment_length = frame_count // config.NUM_PROCESSES
    start_idx = int(args.segment_idx * segment_length)
    end_idx = int((args.segment_idx + 1) * segment_length)
    if end_idx + segment_length > frame_count:
        end_idx = frame_count

    ## seek to start
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_idx)

    fps = cap.get(cv2.CAP_PROP_FPS)
    target_fps = config.FRAMES_READ_PER_SECOND_OF_VIDEO

    frame_interval = math.ceil(fps / target_fps)
    _log.info(f"{fps=}, {target_fps=}, {frame_count=}, {frame_interval=}, {start_idx=}, {end_idx=}")
    measurements = []
    frames_per_pct = frame_count / 100

    pct_progress = 0
    for frame_idx in range(start_idx, end_idx, frame_interval):
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        success, frame = cap.read()
        if not success:
            break
        _log_frame = _log.bind(frame=frame_idx)
        _log_frame.info(f"reading frame %d", frame_idx)

        # take the right half of the frame
        frame = frame[:, frame.shape[1] // 2:, :]
        cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        bb_tuple = tuple(bounding_box) if bounding_box[0] is not None else None
        location, _bounding_box = dc.locate_car(frame, bb_tuple, map_keypoints, map_descriptors, _log_frame)
        _log_frame.info(f"located car at {location} ({bounding_box})")
        if location is not None:
            # get current time in video
            time = int(cap.get(cv2.CAP_PROP_POS_MSEC))
            measurements.append(({"x": location[0], "y": location[1], "time": time}))
            if bounding_box[0] is None and _bounding_box is not None:
                bounding_box[0] = _bounding_box[0]
                bounding_box[1] = _bounding_box[1]
                bounding_box[2] = _bounding_box[2]
                bounding_box[3] = _bounding_box[3]

            # if config.DEBUG and len(measurements) > 1:
            #     l1, t1 = measurements[-2]
            #     l2, t2 = measurements[-1]
            #     cv2.line(map_annotated, l1, l2, (0, 0, 255), 1)
        del frame
        if math.floor(frame_idx * frame_interval / frames_per_pct) > pct_progress:
            pct_progress += 1
            inc_progress(1)

    return measurements
