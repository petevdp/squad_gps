#!/usr/bin/env python

import math
import multiprocessing as mp
import os
import sys
from typing import NamedTuple

import cv2
import structlog

import detect_car as dc

file_dir = os.path.dirname(__file__)
sys.path.append(file_dir)

import config
from logger import log
import extract_map_data

from server.supabase import supabase


class ExtractRouteArgs(NamedTuple):
    map_name: str
    video_path: str
    log: structlog.BoundLogger
    segment_idx: int = 0


def process_to_outputs(args: ExtractRouteArgs, outputs, progress_out):
    def increment_progress(inc_amount):
        progress_out.send(inc_amount)

    outputs[args.segment_idx] = extract_route(args, increment_progress)


def report_progress(progress_updates, route_id):
    _log = log.bind(route_id=route_id)
    progress = 0
    try:
        while True:
            progress += progress_updates.recv()
            _log.info("Updating Progress", progress=progress)
            supabase.from_("routes").update({"progress": progress, "status": "inProgress"}).eq("id", route_id).execute()
    except EOFError:
        pass


def extract_route_multiprocessing(route_id, map_name, video_path, _log):
    _log = log.bind(map_name=map_name, video_path=video_path)
    mgr = mp.Manager()
    outputs = mgr.list([None] * config.NUM_PROCESSES)
    progress_in, progress_out = mp.Pipe()
    report_progress_process = mp.Process(target=report_progress, args=(progress_out, route_id))
    report_progress_process.start()

    processes = [
        mp.Process(target=process_to_outputs,
                   args=(ExtractRouteArgs(map_name, video_path, _log, idx), outputs, progress_in))
        for idx in range(config.NUM_PROCESSES)]

    for i, p in enumerate(processes):
        _log.info(f"starting process {i}")
        p.start()
    for p in processes:
        p.join()
        p.close()

    _log.info(f"finished processing video")
    progress_in.close()
    report_progress_process.join()
    _log.info(f"finished reporting progress")
    report_progress_process.close()
    measurements = [r for s in outputs[:] for r in s]
    return measurements


def extract_route(args: ExtractRouteArgs, inc_progress):
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
        success, image = cap.read()
        if not success:
            break
        _log_frame = _log.bind(frame=frame_idx)
        _log_frame.info(f"reading frame %d", frame_idx)

        # take the right half of the image
        image = image[:, image.shape[1] // 2:, :]
        cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        location = dc.locate_car(image, map_keypoints, map_descriptors, _log_frame)
        if location is not None:
            # get current time in video
            time = int(cap.get(cv2.CAP_PROP_POS_MSEC))
            measurements.append(({"x": location[0], "y": location[1], "time": time}))

            # if config.DEBUG and len(measurements) > 1:
            #     l1, t1 = measurements[-2]
            #     l2, t2 = measurements[-1]
            #     cv2.line(map_annotated, l1, l2, (0, 0, 255), 1)
        del image
        if math.floor(frame_idx * frame_interval / frames_per_pct) > pct_progress:
            pct_progress += 1
            inc_progress(1)

    return measurements
