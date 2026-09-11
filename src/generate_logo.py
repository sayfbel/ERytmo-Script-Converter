from PIL import Image, ImageDraw, ImageFont
import os

def create_app_logo(output_png_path, output_ico_path):
    size = (512, 512)
    # Create soft gradient light background image
    img = Image.new("RGBA", size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Draw rounded rectangle background (Crisp Light Theme style: White with subtle slate border)
    margin = 16
    draw.rounded_rectangle(
        [(margin, margin), (size[0] - margin, size[1] - margin)],
        radius=90,
        fill=(255, 255, 255, 255),
        outline=(226, 232, 240, 255), # Light slate border #E2E8F0
        width=12
    )

    # Draw modern waveform / script icon emblem (Blue #2563EB to Indigo #4F46E5)
    # Waveform rhythm lines symbolizing ERytmo rhythm track
    center_y = size[1] // 2 - 20
    
    # Draw stylized 'E' / Rhythm wave bars
    bar_color = (37, 99, 235, 255) # Indigo Blue #2563EB
    bar_dark = (15, 23, 42, 255)  # Dark slate #0F172A

    # Bar positions (x_start, y_start, x_end, y_end)
    bars = [
        [(110, 190), (110, 310)],
        [(170, 130), (170, 370)],
        [(230, 220), (230, 280)],
        [(290, 160), (290, 340)],
        [(350, 200), (350, 300)],
        [(410, 240), (410, 270)]
    ]

    for x_start, y_start in zip([110, 170, 230, 290, 350, 410], [180, 120, 210, 150, 190, 230]):
        h = [140, 260, 90, 210, 130, 70][[110, 170, 230, 290, 350, 410].index(x_start)]
        draw.rounded_rectangle(
            [(x_start, center_y - h//2), (x_start + 24, center_y + h//2)],
            radius=12,
            fill=bar_color if x_start in [170, 290] else bar_dark
        )

    # Draw bottom accent line
    draw.rounded_rectangle(
        [(110, 410), (410, 426)],
        radius=8,
        fill=(37, 99, 235, 255)
    )

    img.save(output_png_path, format="PNG")
    
    # Save as multi-resolution Windows ICO
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img.save(output_ico_path, format="ICO", sizes=ico_sizes)
    print(f"Generated PNG Logo: {output_png_path}")
    print(f"Generated ICO Icon: {output_ico_path}")

if __name__ == "__main__":
    src_dir = os.path.dirname(os.path.abspath(__file__))
    create_app_logo(
        os.path.join(src_dir, "app_logo.png"),
        os.path.join(src_dir, "app_logo.ico")
    )
