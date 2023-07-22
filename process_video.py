#!/usr/bin/env python

import csv
import json
import os
import sys

from matplotlib import pyplot as plt

import detect_car as dc
import cv2

plt.rcParams['figure.dpi'] = 300


def process_video(video_path):
    print(f"processing {video_path}")
    cap = cv2.VideoCapture(video_path)

    # this reads the first frame
    count = 0
    map_path = './maps/map-fullsize/Yehorivka_Minimap.png'
    map = cv2.imread(map_path, cv2.IMREAD_COLOR)
    map_name = "yehorivka"
    map_annotated = map.copy()

    measurements = []

    # so long as vidcap can read the current frame...
    while True:
        # ...read the next frame (this is now your current frame)
        success, image = cap.read()
        if not success:
            break
        count += 1  # moved this to be accurate with my 'second frame' statement
        if count % 50 != 0:
            continue
        print(f"reading frame {count:d}")

        # take the right half of the image
        image = image[:, image.shape[1] // 2:, :]

        location = dc.locate_car(map_name, map, image)
        # get current time in video
        if location is not None:
            time = round(cap.get(cv2.CAP_PROP_POS_MSEC))
            measurements.append((location, time))

    for i in range(len(measurements) - 1):
        l1, t1 = measurements[i]
        l2, t2 = measurements[i + 1]
        cv2.line(map_annotated, l1, l2, (0, 0, 255), 1)

    # get raw name of video
    video_name = video_path.split('/')[-1].split('.')[0]

    data_filename = video_name + ".csv"
    # write to csv
    print("writing to csv")
    with open(f'./routes/{map_name}/{data_filename}', 'w') as f:
        writer = csv.writer(f)
        writer.writerow(['x', 'y', 'time'])
        for l, time in measurements:
            writer.writerow([l[0], l[1], time])

    index_path = f'./routes/{map_name}/index.json'
    if not os.path.exists(index_path):
        index = []
    else:
        with open(index_path, 'r') as f:
            index = json.load(f)
    index.append(data_filename)
    index = list(set(index))
    with open(index_path, 'w') as f:
        json.dump(index, f)

    plt.imshow(map_annotated), plt.show()
    print(f"done writing {data_filename}")


if __name__ == "__main__":
    process_video(sys.argv[1])
