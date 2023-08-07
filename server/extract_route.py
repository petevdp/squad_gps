#!/usr/bin/env python
import math
import multiprocessing as mp
import os
import sys

import cv2

import detect_car as dc

file_dir = os.path.dirname(__file__)
sys.path.append(file_dir)

from shared import ExtractRouteArgs
import config
from logger import log


def process_to_outputs(args: ExtractRouteArgs, outputs):
    measurements = extract_route(args)
    outputs[args.segment_idx] = measurements


def extract_route_multiprocessing(map_name, video_path, _log):
    _log = log.bind(map_name=map_name, video_path=video_path)
    mgr = mp.Manager()
    outputs = mgr.list([None] * config.NUM_PROCESSES)

    processes = [
        mp.Process(target=process_to_outputs, args=(ExtractRouteArgs(map_name, video_path, _log, idx), outputs))
        for idx in range(config.NUM_PROCESSES)]

    for i, p in enumerate(processes):
        _log.info(f"starting process {i}")
        p.start()
    for p in processes:
        p.join()

    _log.info(f"finished processing video")
    measurements = [r for s in outputs[:] for r in s]
    return measurements


def extract_route(args: ExtractRouteArgs):
    _log = args.log.bind(segment_idx=args.segment_idx)
    _log.info("processing %s", args.map_name)
    cap = cv2.VideoCapture(args.video_path)
    map_path = os.path.join(config.MAPS_DIR, args.map_name + ".png")

    map = cv2.imread(map_path, cv2.IMREAD_COLOR)
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

    for frame_idx in range(start_idx, end_idx, frame_interval):
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        success, image = cap.read()
        if not success:
            break
        _log_frame = _log.bind(frame=frame_idx)
        _log_frame.info(f"reading frame %d", frame_idx)

        # take the right half of the image
        image = image[:, image.shape[1] // 2:, :]

        location = dc.locate_car(args.map_name, map, image, _log_frame)
        # get current time in video
        if location is not None:
            time = int(cap.get(cv2.CAP_PROP_POS_MSEC))
            measurements.append(({"x": location[0], "y": location[1], "time": time}))

            # if config.DEBUG and len(measurements) > 1:
            #     l1, t1 = measurements[-2]
            #     l2, t2 = measurements[-1]
            #     cv2.line(map_annotated, l1, l2, (0, 0, 255), 1)
        del image

    return measurements


if __name__ == "__main__":
    try:
        args = ExtractRouteArgs(*sys.argv[1:])
        out = extract_route_multiprocessing(args.map_name, args.video_path, log)
    except Exception as e:
        log.exception(e)
