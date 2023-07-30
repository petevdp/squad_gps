import logging
import sys

logging.basicConfig(filename='logs/process_video.log', encoding='utf-8', level=logging.DEBUG)
log = logging.getLogger(__name__ + "_" + sys.argv[3])
