import json

rows = json.load(open("./paths.json", "r"))

rows_bytes = [len(json.dumps(row['path']).encode('utf-8')) for row in rows]
print(sorted(rows_bytes, reverse=True))
