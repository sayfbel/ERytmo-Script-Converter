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

    project_root = os.path.dirname(root_dir)

    cmd = [
        "pyinstaller",
        "--noconfirm",
        "--clean",
        "--noconsole",
        "--onefile",
        f"--icon={logo_ico}",
        "--name=ERytmo_V2",
        f"--add-data={logo_png};.",
        f"--add-data={logo_ico};.",
        f"--add-data={root_dir};backend",
        f"--add-data={os.path.join(project_root, 'frontend', 'out')};frontend/out",
        f"--paths={project_root}",
        "--hidden-import=fastapi",
        "--hidden-import=uvicorn",
        "--hidden-import=webview",
        "--hidden-import=sqlalchemy",
        "--hidden-import=openpyxl",
        "--hidden-import=docx",
        "--collect-submodules=openpyxl",
        "--collect-submodules=backend",
        f"--distpath={dist_dir}",
        f"--workpath={build_dir}",
        os.path.join(root_dir, "app.py")
    ]

    print("Executing PyInstaller build command:")
    print(" ".join(cmd))
    
    res = subprocess.run(cmd, cwd=src_dir)
    if res.returncode == 0:
        exe_path = os.path.join(dist_dir, "ERytmo_V2.exe")
        print("\n==================================================")
        print("BUILD SUCCESSFUL!")
        print(f"Standalone Executable: {exe_path}")
        print("==================================================")
    else:
        print(f"PyInstaller build failed with exit code: {res.returncode}")

if __name__ == "__main__":
    build_executable()
