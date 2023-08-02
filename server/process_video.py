#!/usr/bin/env python
import csv
import os
import sys

import cv2

import detect_car as dc

file_dir = os.path.dirname(__file__)
sys.path.append(file_dir)

from shared import ProcessVideoArgs
import config
from logger import log


def process_video(args: ProcessVideoArgs):
    _log.info("processing %s", args.map_name)
    cap = cv2.VideoCapture(args.video_path)
    map_path = os.path.join(config.MAPS_DIR, args.map_name + ".png")

    map = cv2.imread(map_path, cv2.IMREAD_COLOR)
    # if config.DEBUG:
    #     map_annotated = map.copy()
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    segment_length = frame_count // config.NUM_PROCESSES
    segment_idx = int(args.segment_idx)

    start_idx = int(segment_idx * segment_length)
    end_idx = int((segment_idx + 1) * segment_length)
    if end_idx + segment_length > frame_count:
        end_idx = frame_count

    ## seek to start
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_idx)

    fps = cap.get(cv2.CAP_PROP_FPS)
    target_fps = 1 / 3

    frame_interval = int(fps / target_fps)
    _log.info(f"{fps=}, {target_fps=}, {frame_count=}, {frame_interval=}, {start_idx=}, {end_idx=}")
    measurements = []

    for i in range(start_idx, end_idx):
        success, image = cap.read()
        if not success:
            break
        if i % frame_interval != 0 and target_fps < fps:
            continue
        _log.info(f"reading frame %d", i)

        # take the right half of the image
        image = image[:, image.shape[1] // 2:, :]

        location = dc.locate_car(args.map_name, map, image)
        # get current time in video
        if location is not None:
            time = cap.get(cv2.CAP_PROP_POS_MSEC)
            measurements.append((location, time))

            # if config.DEBUG and len(measurements) > 1:
            #     l1, t1 = measurements[-2]
            #     l2, t2 = measurements[-1]
            #     cv2.line(map_annotated, l1, l2, (0, 0, 255), 1)

    # if config.DEBUG:
    #     plt.imshow(map_annotated), plt.show()
    _log.info(f"writing to {args.outfile_path}")
    with open(args.outfile_path, 'w') as f:
        writer = csv.writer(f)
        for l, time in measurements:
            writer.writerow([l[0], l[1], time])


if __name__ == "__main__":
    args = ProcessVideoArgs(*sys.argv[1:])
    _log = log.bind(map_name=args.map_name, video_path=args.video_path, segment_idx=args.segment_idx)
    try:
        process_video(args)
    except Exception as e:
        log.exception(e)
