import os
from typing import List

import cv2
import numpy as np

DATA_DIR = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'map_data')
MAPS_DIR = os.path.join(os.path.abspath(os.path.dirname(__file__)), '../maps/maps_fullsize')


def save_keypoints_and_descriptors(kps: List[cv2.KeyPoint], desc, map_name):
    filename = os.path.join(DATA_DIR, f'{map_name}.npz')
    raw = []
    for kp in kps:
        raw.append([kp.pt[0], kp.pt[1], kp.size, kp.angle, kp.response, kp.octave, kp.class_id])
    np.savez(filename, keypoints=raw, descriptors=desc)


def read_keypoints_and_descriptors(map_name):
    filename = os.path.join(DATA_DIR, f'{map_name}.npz')
    with np.load(filename) as data:
        keypoints_raw = data['keypoints']
        descriptors = data['descriptors']

    keypoints = []
    for kps_raw in keypoints_raw:
        keypoints.append(cv2.KeyPoint(x=kps_raw[0], y=kps_raw[1], size=kps_raw[2],
                                      angle=kps_raw[3], response=kps_raw[4], octave=int(kps_raw[5]),
                                      class_id=int(kps_raw[6])))

    return keypoints, descriptors


def unpickle_keypos():
    pass


def main():
    sift = cv2.SIFT_create()
    for map_filename in os.listdir(MAPS_DIR):
        map = cv2.imread(f'maps_fullsize/{map_filename}')
        cv2.cvtColor(map, cv2.COLOR_BGR2GRAY)
        map_name = map_filename.split('.')[0]
        print('saving', map_name)
        kps, desc = sift.detectAndCompute(map, None)
        save_keypoints_and_descriptors(kps, desc, map_name)


if __name__ == '__main__':
    main()
