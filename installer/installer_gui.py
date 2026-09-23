import os
import sys
import shutil
import subprocess
from PySide6.QtWidgets import (
    QApplication, QWizard, QWizardPage, QVBoxLayout, QHBoxLayout, QLabel,
    QLineEdit, QPushButton, QCheckBox, QFileDialog, QProgressBar, QMessageBox
)
from PySide6.QtCore import Qt, QThread, Signal
from PySide6.QtGui import QIcon, QPixmap, QFont

def get_resource_path(relative_path):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), relative_path)

def create_windows_shortcut(target_exe, shortcut_path, icon_path=None, description=""):
    import win32com.client
    ws = win32com.client.Dispatch("WScript.Shell")
    shortcut = ws.CreateShortcut(shortcut_path)
    shortcut.TargetPath = target_exe
    shortcut.WorkingDirectory = os.path.dirname(target_exe)
    if icon_path and os.path.exists(icon_path):
        shortcut.IconLocation = f"{icon_path},0"
    if description:
        shortcut.Description = description
    shortcut.Save()

class InstallWorker(QThread):
    progress_signal = Signal(str, int)
    finished_signal = Signal(bool, str)

    def __init__(self, target_dir, create_desktop, create_startmenu):
        super().__init__()
        self.target_dir = target_dir
        self.create_desktop = create_desktop
        self.create_startmenu = create_startmenu

    def run(self):
        try:
            self.progress_signal.emit("Preparing installation directory...", 10)
            os.makedirs(self.target_dir, exist_ok=True)

            app_exe_src = get_resource_path("ERytmo_Script_Converter.exe")
            logo_png_src = get_resource_path("app_logo.png")
            logo_ico_src = get_resource_path("app_logo.ico")

            if not os.path.exists(app_exe_src):
                raise FileNotFoundError("Application executable not found inside setup package.")

            target_exe = os.path.join(self.target_dir, "ERytmo_Script_Converter.exe")
            target_ico = os.path.join(self.target_dir, "app_logo.ico")
            target_png = os.path.join(self.target_dir, "app_logo.png")

            self.progress_signal.emit("Copying application files...", 40)
            shutil.copy2(app_exe_src, target_exe)
            
            if os.path.exists(logo_ico_src):
                shutil.copy2(logo_ico_src, target_ico)
            if os.path.exists(logo_png_src):
                shutil.copy2(logo_png_src, target_png)

            self.progress_signal.emit("Creating shortcuts...", 70)
            
            # Create Desktop Shortcut
            if self.create_desktop:
                desktop_dir = os.path.join(os.path.expanduser("~"), "Desktop")
                shortcut_path = os.path.join(desktop_dir, "ERytmo Script Converter.lnk")
                create_windows_shortcut(target_exe, shortcut_path, target_ico, "ERytmo Script Converter")

            # Create Start Menu Shortcut
            if self.create_startmenu:
                appdata_dir = os.getenv("APPDATA")
                start_menu_dir = os.path.join(appdata_dir, "Microsoft", "Windows", "Start Menu", "Programs", "ERytmo Script Converter")
                os.makedirs(start_menu_dir, exist_ok=True)
                shortcut_path = os.path.join(start_menu_dir, "ERytmo Script Converter.lnk")
                create_windows_shortcut(target_exe, shortcut_path, target_ico, "ERytmo Script Converter")

            self.progress_signal.emit("Installation complete!", 100)
            self.finished_signal.emit(True, target_exe)
        except Exception as e:
            self.finished_signal.emit(False, str(e))

class InstallerWizard(QWizard):
    def __init__(self):
        super().__init__()
        self.installed_exe_path = None

        self.setWindowTitle("ERytmo Script Converter v1.0 Setup")
        self.resize(620, 440)
        self.setWizardStyle(QWizard.ModernStyle)

        logo_ico = get_resource_path("app_logo.ico")
        if os.path.exists(logo_ico):
            self.setWindowIcon(QIcon(logo_ico))

        self.setStyleSheet("""
            QWizard {
                background-color: #F8FAFC;
            }
            QWizardPage {
                background-color: #FFFFFF;
                border: 1px solid #E2E8F0;
                border-radius: 12px;
            }
            QLabel {
                font-family: 'Segoe UI', Arial, sans-serif;
                color: #0F172A;
            }
            QLineEdit {
                background-color: #FFFFFF;
                border: 1px solid #CBD5E1;
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 13px;
                color: #0F172A;
            }
            QPushButton {
                background-color: #2563EB;
                color: #FFFFFF;
                font-weight: bold;
                border-radius: 6px;
                padding: 6px 16px;
                border: none;
            }
            QPushButton:hover {
                background-color: #1D4ED8;
            }
            QCheckBox {
                font-size: 13px;
                color: #334155;
            }
        """)

        # Add Wizard Pages
        self.page_welcome = self.create_welcome_page()
        self.page_folder = self.create_folder_page()
        self.page_options = self.create_options_page()
        self.page_install = self.create_install_page()
        self.page_finish = self.create_finish_page()

        self.addPage(self.page_welcome)
        self.addPage(self.page_folder)
        self.addPage(self.page_options)
        self.addPage(self.page_install)
        self.addPage(self.page_finish)

    def create_welcome_page(self):
        page = QWizardPage()
        page.setTitle("Welcome to ERytmo Script Converter v1.0 Setup")
        layout = QVBoxLayout(page)
        layout.setContentsMargins(24, 20, 24, 20)

        header_box = QHBoxLayout()
        logo_png = get_resource_path("app_logo.png")
        if os.path.exists(logo_png):
            logo = QLabel()
            logo.setPixmap(QPixmap(logo_png).scaled(64, 64, Qt.KeepAspectRatio, Qt.SmoothTransformation))
            header_box.addWidget(logo)

        text_box = QVBoxLayout()
        t1 = QLabel("Install ERytmo Script Converter v1.0")
        t1.setFont(QFont("Segoe UI", 14, QFont.Bold))
        t2 = QLabel("This wizard will guide you through installing ERytmo Script Converter v1.0 on your computer.")
        t2.setFont(QFont("Segoe UI", 10))
        t2.setWordWrap(True)
        t2.setStyleSheet("color: #64748B;")
        text_box.addWidget(t1)
        text_box.addWidget(t2)
        header_box.addLayout(text_box)
        layout.addLayout(header_box)

        layout.addSpacing(20)
        info_label = QLabel("Click Next to choose the installation folder and start setup.")
        info_label.setFont(QFont("Segoe UI", 10))
        layout.addWidget(info_label)
        layout.addStretch()
        return page

    def create_folder_page(self):
        page = QWizardPage()
        page.setTitle("Choose Destination Folder")
        layout = QVBoxLayout(page)
        layout.setContentsMargins(24, 20, 24, 20)

        lbl = QLabel("Select the folder where you want to install ERytmo Script Converter:")
        lbl.setFont(QFont("Segoe UI", 10))
        layout.addWidget(lbl)
        layout.addSpacing(10)

        folder_box = QHBoxLayout()
        default_dir = os.path.join(os.getenv("LOCALAPPDATA"), "Programs", "ERytmo Script Converter")
        self.folder_input = QLineEdit(default_dir)
        browse_btn = QPushButton("Browse...")
        browse_btn.clicked.connect(self.browse_folder)

        folder_box.addWidget(self.folder_input)
        folder_box.addWidget(browse_btn)
        layout.addLayout(folder_box)

        layout.addSpacing(15)
        space_lbl = QLabel("Destination folder requires approximately 75 MB of free disk space.")
        space_lbl.setFont(QFont("Segoe UI", 9))
        space_lbl.setStyleSheet("color: #64748B;")
        layout.addWidget(space_lbl)
        layout.addStretch()
        return page

    def browse_folder(self):
        folder = QFileDialog.getExistingDirectory(self, "Select Destination Directory", self.folder_input.text())
        if folder:
            self.folder_input.setText(folder)

    def create_options_page(self):
        page = QWizardPage()
        page.setTitle("Select Additional Shortcuts")
        layout = QVBoxLayout(page)
        layout.setContentsMargins(24, 20, 24, 20)

        lbl = QLabel("Choose which shortcuts you would like setup to create:")
        lbl.setFont(QFont("Segoe UI", 10))
        layout.addWidget(lbl)
        layout.addSpacing(15)

        self.chk_desktop = QCheckBox("Create a Desktop shortcut")
        self.chk_desktop.setChecked(True)

        self.chk_startmenu = QCheckBox("Create a Start Menu shortcut")
        self.chk_startmenu.setChecked(True)

        layout.addWidget(self.chk_desktop)
        layout.addSpacing(10)
        layout.addWidget(self.chk_startmenu)
        layout.addStretch()
        return page

    def create_install_page(self):
        page = QWizardPage()
        page.setTitle("Installing Application")
        layout = QVBoxLayout(page)
        layout.setContentsMargins(24, 20, 24, 20)

        self.status_label = QLabel("Click Next to start installation...")
        self.status_label.setFont(QFont("Segoe UI", 10))
        layout.addWidget(self.status_label)
        layout.addSpacing(15)

        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 100)
        self.progress_bar.setValue(0)
        self.progress_bar.setStyleSheet("""
            QProgressBar {
                border: none;
                background-color: #E2E8F0;
                height: 10px;
                border-radius: 5px;
            }
            QProgressBar::chunk {
                background-color: #2563EB;
                border-radius: 5px;
            }
        """)
        layout.addWidget(self.progress_bar)
        layout.addStretch()
        return page

    def initializePage(self, page_id):
        if page_id == 3: # Install page
            self.button(QWizard.NextButton).setEnabled(False)
            self.button(QWizard.BackButton).setEnabled(False)

            target_dir = self.folder_input.text().strip()
            create_desktop = self.chk_desktop.isChecked()
            create_startmenu = self.chk_startmenu.isChecked()

            self.worker = InstallWorker(target_dir, create_desktop, create_startmenu)
            self.worker.progress_signal.connect(self.on_install_progress)
            self.worker.finished_signal.connect(self.on_install_finished)
            self.worker.start()

    def on_install_progress(self, message, percent):
        self.status_label.setText(message)
        self.progress_bar.setValue(percent)

    def on_install_finished(self, success, result):
        if success:
            self.installed_exe_path = result
            self.button(QWizard.NextButton).setEnabled(True)
            self.next()
        else:
            QMessageBox.critical(self, "Installation Error", f"Failed to install application:\n{result}")

    def create_finish_page(self):
        page = QWizardPage()
        page.setTitle("Completing Setup")
        layout = QVBoxLayout(page)
        layout.setContentsMargins(24, 20, 24, 20)

        lbl = QLabel("ERytmo Script Converter has been successfully installed on your computer!")
        lbl.setFont(QFont("Segoe UI", 11, QFont.Bold))
        lbl.setStyleSheet("color: #166534;")
        layout.addWidget(lbl)
        layout.addSpacing(20)

        self.chk_launch = QCheckBox("Run ERytmo Script Converter now")
        self.chk_launch.setChecked(True)
        self.chk_launch.setFont(QFont("Segoe UI", 11, QFont.Bold))
        layout.addWidget(self.chk_launch)

        layout.addStretch()
        return page

    def accept(self):
        if self.chk_launch.isChecked() and self.installed_exe_path and os.path.exists(self.installed_exe_path):
            os.startfile(self.installed_exe_path)
        super().accept()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    wizard = InstallerWizard()
    wizard.show()
    sys.exit(app.exec())
