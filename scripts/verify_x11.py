#!/usr/bin/env python3
"""Verify Hronomancer overlay geometry and click-through on X11."""

from __future__ import annotations

import ctypes
import re
import subprocess
import sys
from dataclasses import dataclass


@dataclass(frozen=True)
class Geometry:
    width: int
    height: int
    x: int
    y: int


class XRectangle(ctypes.Structure):
    _fields_ = [
        ("x", ctypes.c_short),
        ("y", ctypes.c_short),
        ("width", ctypes.c_ushort),
        ("height", ctypes.c_ushort),
    ]


def command(*args: str) -> str:
    return subprocess.check_output(args, text=True)


def read_monitors() -> set[Geometry]:
    monitor_pattern = re.compile(
        r"^\s*\d+:\s+.*?\s+(\d+)/\d+x(\d+)/\d+\+(-?\d+)\+(-?\d+)\s+"
    )
    monitors: set[Geometry] = set()
    for line in command("xrandr", "--listactivemonitors").splitlines():
        if match := monitor_pattern.match(line):
            width, height, x, y = map(int, match.groups())
            monitors.add(Geometry(width, height, x, y))
    return monitors


def read_overlays() -> list[tuple[int, Geometry]]:
    window_pattern = re.compile(
        r'^\s*(0x[0-9a-f]+)\s+"Hronomancer Overlay \d+".*?'
        r"\s(\d+)x(\d+)\+(-?\d+)\+(-?\d+)\s",
        re.IGNORECASE,
    )
    overlays: list[tuple[int, Geometry]] = []
    for line in command("xwininfo", "-root", "-tree").splitlines():
        if match := window_pattern.match(line):
            window_id, width, height, x, y = match.groups()
            overlays.append(
                (
                    int(window_id, 16),
                    Geometry(int(width), int(height), int(x), int(y)),
                )
            )
    return overlays


def input_shape_area(window_id: int) -> tuple[int, int]:
    x11 = ctypes.CDLL("libX11.so.6")
    xext = ctypes.CDLL("libXext.so.6")

    x11.XOpenDisplay.argtypes = [ctypes.c_char_p]
    x11.XOpenDisplay.restype = ctypes.c_void_p
    x11.XFree.argtypes = [ctypes.c_void_p]
    x11.XFree.restype = ctypes.c_int
    xext.XShapeGetRectangles.argtypes = [
        ctypes.c_void_p,
        ctypes.c_ulong,
        ctypes.c_int,
        ctypes.POINTER(ctypes.c_int),
        ctypes.POINTER(ctypes.c_int),
    ]
    xext.XShapeGetRectangles.restype = ctypes.POINTER(XRectangle)

    display = x11.XOpenDisplay(None)
    if not display:
        raise RuntimeError("cannot open X11 display")

    rectangle_count = ctypes.c_int()
    ordering = ctypes.c_int()
    shape_input = 2
    rectangles = xext.XShapeGetRectangles(
        display,
        window_id,
        shape_input,
        ctypes.byref(rectangle_count),
        ctypes.byref(ordering),
    )

    area = 0
    if rectangles:
        area = sum(
            rectangles[index].width * rectangles[index].height
            for index in range(rectangle_count.value)
        )
        x11.XFree(rectangles)

    return rectangle_count.value, area


def main() -> int:
    monitors = read_monitors()
    overlays = read_overlays()
    overlay_geometries = {geometry for _, geometry in overlays}
    failed = overlay_geometries != monitors

    if failed:
        print(
            f"FAIL overlay geometries {sorted(map(str, overlay_geometries))} "
            f"!= monitors {sorted(map(str, monitors))}"
        )

    for window_id, geometry in overlays:
        rectangles, input_area = input_shape_area(window_id)
        geometry_ok = geometry in monitors
        click_through_ok = input_area == 0
        print(
            f"xid=0x{window_id:x} "
            f"geometry={geometry.width}x{geometry.height}@{geometry.x},{geometry.y} "
            f"input_rectangles={rectangles} input_area={input_area} "
            f"geometry={'PASS' if geometry_ok else 'FAIL'} "
            f"click_through={'PASS' if click_through_ok else 'FAIL'}"
        )
        failed |= not geometry_ok or not click_through_ok

    if not overlays:
        print("FAIL no Hronomancer overlay windows found")
        failed = True

    return int(failed)


if __name__ == "__main__":
    sys.exit(main())
