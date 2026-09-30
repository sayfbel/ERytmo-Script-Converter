import os
from PIL import Image, ImageDraw

def render_soundwave(size=512, color=(245, 158, 11, 255), bg_color=(0, 0, 0, 0)):
    # Render at 4x for supersampling and ultra-crisp edges
    scale = 4
    w, h = size * scale, size * scale
    img = Image.new('RGBA', (w, h), bg_color)
    draw = ImageDraw.Draw(img)

    pad = 28 * scale
    target_w = w - 2 * pad
    target_h = h - 2 * pad

    sx = target_w / 128.0
    sy = target_h / 140.0
    s = min(sx, sy)

    svg_center_x = 196
    svg_center_y = 120
    out_center_x = w / 2
    out_center_y = h / 2

    bars = [
        (140, 120, 4.4, 18),
        (156, 120, 7.0, 39),
        (174, 120, 10.4, 59),
        (196, 120, 15.4, 68),
        (218, 120, 10.4, 59),
        (236, 120, 7.0, 39),
        (252, 120, 4.4, 18),
    ]

    for (cx, cy, rx, ry) in bars:
        px = out_center_x + (cx - svg_center_x) * s
        py = out_center_y + (cy - svg_center_y) * s
        prx = rx * s
        pry = ry * s
        draw.ellipse([px - prx, py - pry, px + prx, py + pry], fill=color)

    return img.resize((size, size), Image.Resampling.LANCZOS)

def main():
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    public_dir = os.path.join(root, "frontend", "public")
    app_dir = os.path.join(root, "frontend", "src", "app")
    backend_static = os.path.join(root, "backend", "static")
    out_dir = os.path.join(root, "frontend", "out")

    for d in [public_dir, app_dir, backend_static]:
        os.makedirs(d, exist_ok=True)

    # 1. Master images with Studio Yellow/Amber color (#F59E0B)
    icon_512 = render_soundwave(512, color=(245, 158, 11, 255))
    apple_icon = render_soundwave(180, color=(245, 158, 11, 255), bg_color=(15, 23, 42, 255))

    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

    # 2. Save Favicon.ico
    icon_512.save(os.path.join(public_dir, "favicon.ico"), format="ICO", sizes=ico_sizes)
    icon_512.save(os.path.join(backend_static, "favicon.ico"), format="ICO", sizes=ico_sizes)

    # 3. Save PNGs
    icon_512.save(os.path.join(public_dir, "icon.png"))
    icon_512.save(os.path.join(public_dir, "dubflow_icon.png"))
    icon_512.save(os.path.join(app_dir, "icon.png"))
    icon_512.save(os.path.join(backend_static, "icon.png"))

    apple_icon.save(os.path.join(public_dir, "apple-icon.png"))
    apple_icon.save(os.path.join(app_dir, "apple-icon.png"))

    # Also update frontend/out if exists
    if os.path.exists(out_dir):
        icon_512.save(os.path.join(out_dir, "favicon.ico"), format="ICO", sizes=ico_sizes)
        icon_512.save(os.path.join(out_dir, "icon.png"))

    # 4. Save SVG
    svg_content = """<svg viewBox="132 50 128 140" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- DubFlow Soundwave Array in Studio Yellow/Amber (#f59e0b) -->
  <g fill="#f59e0b">
    <ellipse cx="140" cy="120" rx="4" ry="17" />
    <ellipse cx="156" cy="120" rx="6.5" ry="38" />
    <ellipse cx="174" cy="120" rx="10" ry="58" />
    <ellipse cx="196" cy="120" rx="15" ry="67" />
    <ellipse cx="218" cy="120" rx="10" ry="58" />
    <ellipse cx="236" cy="120" rx="6.5" ry="38" />
    <ellipse cx="252" cy="120" rx="4" ry="17" />
  </g>
</svg>
"""
    with open(os.path.join(public_dir, "icon.svg"), "w", encoding="utf-8") as f:
        f.write(svg_content)
    with open(os.path.join(backend_static, "icon.svg"), "w", encoding="utf-8") as f:
        f.write(svg_content)
    if os.path.exists(out_dir):
        with open(os.path.join(out_dir, "icon.svg"), "w", encoding="utf-8") as f:
            f.write(svg_content)

    print("Generated all DubFlow yellow/amber favicons and icons successfully!")

if __name__ == "__main__":
    main()
