from typing import NamedTuple

import structlog


class ExtractRouteArgs(NamedTuple):
    map_name: str
    video_path: str
    log: structlog.BoundLogger
    segment_idx: int = 0
