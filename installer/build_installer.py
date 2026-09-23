import os
import subprocess
import sys

def build_installer_exe():
    installer_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(installer_dir)
    dist_dir = os.path.join(root_dir, "dist")
    build_dir = os.path.join(root_dir, "build_installer")
    
    app_exe = os.path.join(dist_dir, "ERytmo_Script_Converter.exe")
    logo_png = os.path.join(root_dir, "src", "app_logo.png")
    logo_ico = os.path.join(root_dir, "src", "app_logo.ico")

    if not os.path.exists(app_exe):
        raise FileNotFoundError(f"Application executable not found at {app_exe}. Build app executable first.")

    cmd = [
        "pyinstaller",
        "--noconfirm",
        "--clean",
        "--noconsole",
        "--onefile",
        f"--icon={logo_ico}",
        "--name=Setup_ERytmo_Script_Converter",
        f"--add-data={app_exe};.",
        f"--add-data={logo_png};.",
        f"--add-data={logo_ico};.",
        f"--distpath={installer_dir}",
        f"--workpath={build_dir}",
        os.path.join(installer_dir, "installer_gui.py")
    ]

    print("Executing Installer PyInstaller Build Command:")
    print(" ".join(cmd))

    res = subprocess.run(cmd, cwd=installer_dir)
    if res.returncode == 0:
        setup_exe = os.path.join(installer_dir, "Setup_ERytmo_Script_Converter.exe")
        root_setup_exe = os.path.join(root_dir, "Setup_ERytmo_Script_Converter.exe")
        import shutil
        shutil.copy2(setup_exe, root_setup_exe)
        print("\n==================================================")
        print("INSTALLER BUILD SUCCESSFUL!")
        print(f"Standalone Client Setup File: {setup_exe}")
        print(f"Synced to Root Directory: {root_setup_exe}")
        print("==================================================")
    else:
        print(f"PyInstaller build failed with exit code: {res.returncode}")

if __name__ == "__main__":
    build_installer_exe()
