import detect_car as dc

import cv2
import numpy as np
from matplotlib import pyplot as plt

base = cv2.imread('narva.png', cv2.IMREAD_COLOR)
minimap = cv2.imread('car_segments/segment_with_car3.png', cv2.IMREAD_COLOR)
template = cv2.imread('car/car2_masked.png', cv2.IMREAD_COLOR)

# dc.locate_template(minimap, template)
location = dc.locate_car(base, minimap)

basecp = base.copy()
# draw rectangle around car location
cv2.rectangle(basecp, (int(location[0]) - 5, location[1] - 5), (int(location[0]) + 10, location[1] + 10), 255, 3)

plt.imshow(basecp), plt.show()
