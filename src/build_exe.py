import os
import subprocess
import sys

def build_executable():
    src_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(src_dir)
    dist_dir = os.path.join(root_dir, "dist")
    build_dir = os.path.join(root_dir, "build")
    
    logo_png = os.path.join(src_dir, "app_logo.png")
    logo_ico = os.path.join(src_dir, "app_logo.ico")
    
    if not os.path.exists(logo_ico):
        import generate_logo
        generate_logo.create_app_logo(logo_png, logo_ico)

    cmd = [
        "pyinstaller",
        "--noconsole",
        "--onefile",
        f"--icon={logo_ico}",
        "--name=ERytmo_Script_Converter",
        f"--add-data={logo_png};.",
        f"--add-data={logo_ico};.",
        f"--distpath={dist_dir}",
        f"--workpath={build_dir}",
        os.path.join(src_dir, "main_gui.py")
    ]

    print("Executing PyInstaller build command:")
    print(" ".join(cmd))
    
    res = subprocess.run(cmd, cwd=src_dir)
    if res.returncode == 0:
        exe_path = os.path.join(dist_dir, "ERytmo_Script_Converter.exe")
        print("\n==================================================")
        print("BUILD SUCCESSFUL!")
        print(f"Standalone Executable: {exe_path}")
        print("==================================================")
    else:
        print(f"PyInstaller build failed with exit code: {res.returncode}")

if __name__ == "__main__":
    build_executable()
