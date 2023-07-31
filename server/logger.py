import logging
import os
import config


logging.basicConfig(filename=os.path.join(config.LOGS_DIR, "server.log"),
                    level=logging.DEBUG if config.DEBUG else logging.INFO)

log = logging.getLogger()
