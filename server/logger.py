import logging
import os
import sys
import config
import structlog
from pythonjsonlogger import jsonlogger


logging.basicConfig(filename=os.path.join(config.LOGS_DIR, "server.log"),
                    level=logging.DEBUG if config.DEBUG else logging.INFO)

log = logging.getLogger()
