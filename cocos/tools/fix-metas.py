import json
import pathlib

root = pathlib.Path(r"E:\project\MountainSeaAshes\cocos\assets\resources\textures")
for p in root.rglob("*.png.meta"):
    data = json.loads(p.read_text(encoding="utf-8"))
    ud = data.setdefault("userData", {})
    if ud.get("type") == "texture":
        ud["type"] = "sprite-frame"
        p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print("updated", p.name)
print("done")
