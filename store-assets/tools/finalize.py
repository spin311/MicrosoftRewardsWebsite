"""Saves each rendered PNG as 24-bit RGB with no alpha, the Chrome Web Store's format.

Usage: python3 finalize.py <rendered dir> <output dir>
"""
import sys
from pathlib import Path

from PIL import Image

EXPECTED_SIZES = {(1280, 800)}


def main(source: Path, target: Path) -> None:
    for png in sorted(source.glob("*.png")):
        with Image.open(png) as image:
            if image.size not in EXPECTED_SIZES:
                raise SystemExit(f"{png.name}: {image.size} is not a store size")
            image.convert("RGB").save(target / png.name, optimize=True)
        print(f"saved {target / png.name}")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
