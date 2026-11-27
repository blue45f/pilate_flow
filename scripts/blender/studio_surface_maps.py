"""기존 UV와 리깅을 유지하면서 GLB 안에 스튜디오 재질의 표면 지도를 굽는다."""
from __future__ import annotations

import json
import math
import struct
import zlib
from functools import lru_cache
from pathlib import Path


def png_rgb(width, height, pixel):
    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body))

    rows = bytearray()
    for y in range(height):
        rows.append(0)
        for x in range(width):
            rows.extend(pixel(x, y))
    header = struct.pack(">2I5B", width, height, 8, 2, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b""))


# 4×4 배열은 pilates_3d_modeling_kernel의 재질 타일 순서와 같다.
ATLAS_FINISHES = (
    "metal", "metal", "smooth", "smooth",
    "smooth", "smooth", "weave", "weave",
    "smooth", "oak", "oak", "oak",
    "smooth", "hair", "smooth", "weave",
)


def normal_texel(finish, u, v):
    # 주기 함수의 해석적 기울기. 타일 가장자리에서도 무늬가 끊기지 않는다.
    if finish == "oak":
        bend = 2.0 * math.sin(v) + 0.6 * math.sin(3 * v)
        slope = math.cos(7 * u + bend) + 0.24 * math.cos(17 * u + 2 * bend)
        dx = 0.14 * slope
        dy = 0.018 * slope * (2 * math.cos(v) + 1.8 * math.cos(3 * v))
    elif finish == "weave":
        dx = 0.12 * math.cos(9 * u) * math.cos(9 * v)
        dy = -0.12 * math.sin(9 * u) * math.sin(9 * v)
    elif finish == "metal":
        dx, dy = 0, 0.045 * math.cos(14 * v)
    elif finish == "hair":
        dx, dy = 0.08 * math.cos(13 * u + v), 0.006 * math.cos(13 * u + v)
    elif finish == "leather":
        dx = 0.075 * math.cos(9 * u + math.sin(7 * v))
        dy = 0.075 * math.cos(7 * v + math.sin(5 * u))
    else:
        return (128, 128, 255)
    length = math.sqrt(dx * dx + dy * dy + 1)
    return tuple(round(127.5 * (1 + component / length)) for component in (-dx, -dy, 1))


@lru_cache(maxsize=8)
def normal_map(finish):
    tile_size = 64
    size = tile_size * 4 if finish == "atlas" else tile_size

    def pixel(x, y):
        # glTF의 V축과 PNG 행 순서가 Blender UV와 반대다.
        band = (3 - y // tile_size) * 4 + x // tile_size
        role = ATLAS_FINISHES[band] if finish == "atlas" else finish
        u = math.tau * (x % tile_size + 0.5) / tile_size
        v = math.tau * (y % tile_size + 0.5) / tile_size
        return normal_texel(role, u, v)

    return png_rgb(size, size, pixel)


def finish_studio_glb(path):
    """패킹된 메시 버퍼는 그대로 보존한다. 같은 파일에 다시 적용해도 결과 바이트가 같다."""
    path = Path(path)
    original = path.read_bytes()
    json_length = struct.unpack_from("<I", original, 12)[0]
    model = json.loads(original[20:20 + json_length])
    binary = bytearray(original[28 + json_length:][:model["buffers"][0]["byteLength"]])
    images = model["images"]
    views = model["bufferViews"]
    textures = model["textures"]
    generated = {img["name"]: i for i, img in enumerate(images) if img.get("name", "").startswith("AtelierFinish_")}
    if generated:
        # 이 단계에서 추가한 뷰는 파일 끝에만 위치한다.
        first_view = min(images[i]["bufferView"] for i in generated.values())
        if set(range(first_view, len(views))) != {images[i]["bufferView"] for i in generated.values()}:
            raise ValueError("표면 지도 뒤에 다른 데이터가 있어 안전하게 갱신할 수 없습니다.")
        del binary[views[first_view]["byteOffset"]:]

    linear_sampler = {"magFilter": 9729, "minFilter": 9987}
    if linear_sampler not in model["samplers"]:
        model["samplers"].append(linear_sampler)
    sampler = model["samplers"].index(linear_sampler)
    finished = {}

    def texture(suffix, data):
        name = "AtelierFinish_" + suffix
        if name in finished:
            return finished[name]
        binary.extend(b"\0" * (-len(binary) % 4))
        view = {"buffer": 0, "byteOffset": len(binary), "byteLength": len(data)}
        binary.extend(data)
        if name in generated:
            index = generated[name]
            views[images[index]["bufferView"]] = view
            texture_index = next(i for i, t in enumerate(textures) if t["source"] == index)
        else:
            index = len(images)
            images.append({"name": name, "mimeType": "image/png", "bufferView": len(views)})
            views.append(view)
            texture_index = len(textures)
            textures.append({"sampler": sampler, "source": index})
        finished[name] = texture_index
        return texture_index

    for material in model["materials"]:
        name = material["name"]
        if name == "MAT_Apparatus_Studio":
            # TEXCOORD_1.y 중앙값으로 인코딩한 재질 순서. 캐리지와 프레임을 한 번에 그린다.
            rough_metal = [(95, 0), (148, 0), (64, 245), (75, 232), (201, 0), (54, 0), (145, 0), (145, 0)]
            surface = png_rgb(1, 8, lambda x, y: (255, *rough_metal[y]))
            pbr = material["pbrMetallicRoughness"]
            pbr.update({"metallicFactor": 1, "roughnessFactor": 1,
                        "metallicRoughnessTexture": {"index": texture("parts", surface), "texCoord": 1}})
            continue
        if name.startswith("MAT_Studio") or name == "MAT_InstructorStudioPBR":
            finish = "atlas"
        elif name == "PF_WhiteOak_Frame":
            finish = "oak"
        elif name == "PF_Sage_Leather":
            finish = "leather"
        elif name in ("PF_Track_Steel", "PF_Anodized_Brass"):
            finish = "metal"
        else:
            continue
        material["normalTexture"] = {"index": texture(finish, normal_map(finish)), "scale": 0.68}

    model["buffers"][0]["byteLength"] = len(binary)
    binary.extend(b"\0" * (-len(binary) % 4))
    layout = json.dumps(model, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    layout += b" " * (-len(layout) % 4)
    result = struct.pack("<4sIIII", b"glTF", 2, 28 + len(layout) + len(binary), len(layout), 0x4e4f534a)
    result += layout + struct.pack("<II", len(binary), 0x004e4942) + binary
    if original != result:
        temporary = path.with_suffix(".tmp")
        temporary.write_bytes(result)
        temporary.replace(path)


if __name__ == "__main__":
    import sys
    for filename in sys.argv[1:]:
        finish_studio_glb(filename)
