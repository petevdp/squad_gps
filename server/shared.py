from typing import NamedTuple


class ProcessVideoArgs(NamedTuple):
    map_name: str
    video_path: str
    segment_idx: str
    outfile_path: str
