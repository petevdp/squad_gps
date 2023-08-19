import cv2
import numpy as np

DEBUG = True


def draw_point(image, point, color):
    cv2.circle(image, (int(point[0]), int(point[1])), 5, color, -1)


def get_warped_point(image, point, M):
    mask = np.zeros(image.shape[:2], dtype=np.uint8)
    mask[point[0] - 5:point[0] + 5, point[1] - 5: point[1] + 5] = 255
    height, width, channels = image.shape
    warped = cv2.perspectiveTransform(np.float32([point]).reshape(-1, 1, 2), M)
    white_pixels = np.stack(warped.nonzero(), axis=1)
    return white_pixels[0][0]


kp_cache = {}


def locate_car(minimap, map_keypoints, map_descriptors, _log, min_match_count=10):
    sift = cv2.SIFT_create()
    # find the keypoints and descriptors with SIFT
    minimap_keypoints, minimap_descriptors = sift.detectAndCompute(minimap, None)
    minimap_h, minimap_w, minimap_channels = minimap.shape

    FLANN_INDEX_KDTREE = 1
    index_params = dict(algorithm=FLANN_INDEX_KDTREE, trees=5)
    search_params = dict(checks=50)
    flann = cv2.FlannBasedMatcher(index_params, search_params)
    matches = flann.knnMatch(minimap_descriptors, map_descriptors, k=2)
    # store all the good matches as per Lowe's ratio test.
    good = []
    for m, n in matches:
        if m.distance < 0.7 * n.distance:
            good.append(m)
    if len(good) > min_match_count:
        src_pts = np.float32([minimap_keypoints[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
        dst_pts = np.float32([map_keypoints[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
        M, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
        _log.info(f"found homography")
        matches_mask = mask.ravel().tolist()
        inliers_src = src_pts[mask.ravel() == 1]

        # get bounding box for minimap inliers
        x_min = int(np.min(inliers_src[:, 0, 0]))
        x_max = int(np.max(inliers_src[:, 0, 0]))
        y_min = int(np.min(inliers_src[:, 0, 1]))
        y_max = int(np.max(inliers_src[:, 0, 1]))

        car = detect_car_in_minimap(minimap, x_min, x_max, y_min, y_max, _log)
        if car is None:
            return None

        # closest = kp2[good[nearest[0]].trainIdx]
        car_on_map = cv2.perspectiveTransform(np.float32([car]).reshape(-1, 1, 2), M)[0][0]
        return int(car_on_map[0]), int(car_on_map[1])
    else:
        _log.info(f"Not enough matches are found - {len(good)}/{min_match_count}")
        matches_mask = None


def detect_car_in_minimap(image, x_min, x_max, y_min, y_max, _log):
    image = image.copy()
    rect_mask = np.zeros_like(image)
    cv2.rectangle(rect_mask, (x_min, y_min), (x_max, y_max), (255, 255, 255), -1)
    image = cv2.bitwise_and(image, rect_mask)

    lower_yellow = np.array([50, 250, 220])
    upper_yellow = np.array([70, 256, 256])

    # Create a mask using the thresholds
    yellow_mask = cv2.inRange(image, lower_yellow, upper_yellow)

    # Find contours of the yellow regions
    contours, _ = cv2.findContours(yellow_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    _log.info(f"%s yellow regions found", len(contours))
    if len(contours) == 0:
        return None
    # Find the largest contour
    largest_contour = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(largest_contour)

    center = (x + w // 2, y + h // 2)
    return np.array(center)
