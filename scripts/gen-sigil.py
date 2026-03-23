"""
Generate a cyber sigilism SVG from the Tyn Church photo.

Pipeline:
1. Load image, convert to grayscale
2. Apply bilateral filter to smooth while preserving edges
3. Canny edge detection
4. Dilate edges slightly for potrace
5. Export as PBM bitmap
6. Run potrace to generate SVG with smooth Bezier curves
7. Post-process SVG: white strokes on transparent background
"""

import cv2
import numpy as np
import subprocess
import sys
import os

INPUT = os.path.expanduser(
    "~/Downloads/the-two-tall-spires-of-the-church-of-our-lady-before-tn-"
    "towering-over-the-surrounding-buildings-stare-mesto-the-inner-city-of-"
    "prague-czech-republic-W29363-832319234.jpg"
)
OUTPUT_PBM = "/tmp/tyn-edges.pbm"
OUTPUT_SVG = "static/images/tyn-church-sigil.svg"

# --- Step 1: Load and preprocess ---
img = cv2.imread(INPUT)
if img is None:
    print(f"Error: could not load {INPUT}")
    sys.exit(1)

gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# Resize to reasonable dimensions for SVG output
h, w = gray.shape
scale = 800 / max(h, w)
gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
h, w = gray.shape

print(f"Image size after resize: {w}x{h}")

# --- Step 2: Smooth while preserving edges ---
# Bilateral filter: keeps edges sharp, smooths textures (stone, sky)
smooth = cv2.bilateralFilter(gray, 9, 75, 75)

# Additional Gaussian blur to reduce noise
smooth = cv2.GaussianBlur(smooth, (3, 3), 0)

# --- Step 3: Canny edge detection ---
# Use adaptive thresholds based on median intensity
median_val = np.median(smooth)
lower = int(max(0, 0.5 * median_val))
upper = int(min(255, 1.3 * median_val))
print(f"Canny thresholds: {lower} - {upper}")

edges = cv2.Canny(smooth, lower, upper)

# --- Step 4: Dilate to thicken edges slightly for better tracing ---
kernel = np.ones((2, 2), np.uint8)
edges = cv2.dilate(edges, kernel, iterations=1)

# --- Step 5: Crop out bottom row houses (focus on the church towers) ---
# Keep roughly the top 85% of the image
crop_y = int(h * 0.85)
edges_cropped = edges[:crop_y, :]

# Pad back to original size with black (or just use cropped)
edges_final = np.zeros_like(edges)
edges_final[:crop_y, :] = edges_cropped

# --- Step 6: Export as PBM for potrace ---
# potrace expects: 1 = black (foreground), 0 = white (background)
# PBM P4 format: 1-bit bitmap
# edges: 255 = edge, 0 = no edge
# For potrace: we want edges to be the foreground (black in PBM = 1)
# So we invert: edges become 0 (black), background becomes 255 (white)
pbm = 255 - edges_final
cv2.imwrite(OUTPUT_PBM, pbm)
print(f"Wrote PBM: {OUTPUT_PBM}")

# --- Step 7: Run potrace to generate SVG ---
result = subprocess.run(
    [
        "potrace",
        OUTPUT_PBM,
        "-s",              # SVG output
        "-o", OUTPUT_SVG,
        "-t", "5",         # turdsize: suppress speckles smaller than 5px
        "-a", "1.2",       # alphamax: corner threshold (higher = smoother curves)
        "-O", "0.2",       # opttolerance: curve optimization
        "--flat",          # no grouping, flat path list
    ],
    capture_output=True,
    text=True,
)

if result.returncode != 0:
    print(f"potrace error: {result.stderr}")
    sys.exit(1)

print(f"potrace output: {result.stdout}{result.stderr}")

# --- Step 8: Post-process SVG for cyber sigilism style ---
with open(OUTPUT_SVG, "r") as f:
    svg = f.read()

# Replace black fill with white stroke, no fill
# potrace outputs filled black paths; we want white strokes on transparent
svg = svg.replace('fill="#000000"', 'fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"')
svg = svg.replace('fill="black"', 'fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"')

# If potrace uses style attribute instead
svg = svg.replace('style="fill:#000000"', 'style="fill:none;stroke:white;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round"')

# Remove white background rectangle if present
# potrace sometimes adds a white background
import re
svg = re.sub(r'<rect[^>]*fill="white"[^>]*/>', '', svg)
svg = re.sub(r'<rect[^>]*fill="#ffffff"[^>]*/>', '', svg)

with open(OUTPUT_SVG, "w") as f:
    f.write(svg)

print(f"Wrote SVG: {OUTPUT_SVG}")
print("Done!")
