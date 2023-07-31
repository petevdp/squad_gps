#!/usr/bin/env python
import csv
import sys
import os
from matplotlib import pyplot as plt
import detect_car as dc
import cv2

file_dir = os.path.dirname(__file__)
sys.path.append(file_dir)

import config
from logger import log

plt.rcParams['figure.dpi'] = 300


def process_video(map_name, video_path, segment_count=1, segment_idx=0):
    log.info("processing %s", map_name)
    _log = log.getChild("process_video_" + str(segment_idx))
    cap = cv2.VideoCapture(video_path)
    map_path = os.path.join(config.MAPS_DIR, map_name + ".png")

    map = cv2.imread(map_path, cv2.IMREAD_COLOR)
    if config.DEBUG:
        map_annotated = map.copy()
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    segment_length = frame_count // segment_count
    start_idx = int(segment_idx * segment_length)
    end_idx = int((segment_idx + 1) * segment_length)
    if end_idx + segment_length > frame_count:
        end_idx = frame_count

    ## seek to start
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_idx)

    fps = cap.get(cv2.CAP_PROP_FPS)
    target_fps = 1 / 3

    frame_interval = int(fps / target_fps)
    _log.info(f"fps: {fps}, target_fps: {target_fps}")
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

        location = dc.locate_car(map_name, map, image)
        # get current time in video
        if location is not None:
            time = round(cap.get(cv2.CAP_PROP_POS_MSEC))
            measurements.append((location, time))

            if config.DEBUG and len(measurements) > 1:
                l1, t1 = measurements[-2]
                l2, t2 = measurements[-1]
                cv2.line(map_annotated, l1, l2, (0, 0, 255), 1)

    if config.DEBUG:
        plt.imshow(map_annotated), plt.show()

    # write to stdout as csv
    _log.info("writing to stdout")
    writer = csv.writer(sys.stdout)
    writer.writerow(['x', 'y', 'time'])
    for l, time in measurements:
        writer.writerow([l[0], l[1], time])


if __name__ == "__main__":
    process_video(sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]))
