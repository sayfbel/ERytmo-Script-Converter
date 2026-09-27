from PIL import Image, ImageDraw, ImageFont
import os

def create_app_logo(output_png_path, output_ico_path):
    src_dir = os.path.dirname(os.path.abspath(__file__))
    master_path = os.path.join(src_dir, "logo_master.jpg")
    
    if os.path.exists(master_path):
        img = Image.open(master_path)
        # Crop squircle area
        cropped = img.crop((172, 172, 852, 852))
        icon_512 = cropped.resize((512, 512), Image.Resampling.LANCZOS).convert("RGBA")
        
        # Smooth antialiased squircle mask
        mask = Image.new("L", (512 * 4, 512 * 4), 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle([(16, 16), (512 * 4 - 16, 512 * 4 - 16)], radius=420, fill=255)
        mask = mask.resize((512, 512), Image.Resampling.LANCZOS)
        icon_512.putalpha(mask)
    else:
        # Fallback procedural icon
        size = (512, 512)
        icon_512 = Image.new("RGBA", size, (15, 23, 42, 255))
        draw = ImageDraw.Draw(icon_512)
        draw.rounded_rectangle([(8, 8), (504, 504)], radius=105, fill=(15, 23, 42, 255), outline=(20, 184, 166, 255), width=6)

    icon_512.save(output_png_path, format="PNG")
    
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    icon_512.save(output_ico_path, format="ICO", sizes=ico_sizes)
    print(f"Generated PNG Logo: {output_png_path}")
    print(f"Generated ICO Icon: {output_ico_path}")

if __name__ == "__main__":
    src_dir = os.path.dirname(os.path.abspath(__file__))
    create_app_logo(
        os.path.join(src_dir, "app_logo.png"),
        os.path.join(src_dir, "app_logo.ico")
    )
