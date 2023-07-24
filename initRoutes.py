import json
import os

MAP_NAMES = [
    "AlBasrah",
    "Anvil",
    "Belaya",
    "Black_Coast",
    "Chora",
    "Fools_Road",
    "GooseBay",
    "Gorodok_minimap",
    "Gorodok",
    "Harju",
    "Kamdesh",
    "Kohat",
    "Logar_Valley",
    "Mutaha",
    "Narva",
    "Narva",
    "Skorpo",
    "Sumari",
    "Fallujah",
    "Kokan",
    "Lashkar",
    "Manicouagan_Flooded",
    "Manicouagan",
    "Mestia",
    "Tallil_Outskirts",
    "Yehorivka",
]


for name in MAP_NAMES:
    dir_path = "gui/public/data/routes/" + name
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)
    index_path = dir_path + "/index.json"
    if not os.path.exists(index_path):
        with open(index_path, "w") as f:
            json.dump([], f)
    print(f"created {index_path}")


