# ERytmo Script Converter 🎬

A modern Light Mode desktop application designed to convert company subtitling and dubbing scripts (`.docx`, `.pdf`, `.txt`, `.text`) into the exact **Format A specification** required by **ERytmo Factory**.

![ERytmo Script Converter](src/app_logo.png)

---

## 🌟 Key Features

* **Multi-Format Parser**: Supports company Word documents (`.docx`), PDF files (`.pdf`), and plain text files (`.txt`, `.text`).
* **Format A Output**: Automatically converts scripts into ERytmo Factory Format A:
  - **Line 1**: Start Timecode (`HH:MM:SS:FF` or `HH:MM:SS`)
  - **Line 2**: Clean Character Name (e.g. `CÉCILE`, `MUNA`)
  - **Line 3+**: Dialogue / Text / Audio Cues
  - **Line 4**: Blank line separator between cues
* **Automatic OUT Timecode Removal**: Strips OUT timecodes that break ERytmo Factory's internal regex parser.
* **Dual Live Table Preview**:
  - **Table 1**: Raw imported company script preview.
  - **Table 2**: Converted ERytmo Format A script preview.
* **Modern Light Mode GUI**: Built with **PySide6 (Qt)** featuring drag-and-drop file upload, file save dialogs, and clean slate typography.
* **Standalone Windows Installer**: Bundles into a single standalone setup executable (`Setup_ERytmo_Script_Converter.exe`) requiring zero dependencies on client PCs.

---

## 🚀 Getting Started

### Prerequisites

* Python 3.10+
* Windows 10/11

### Installation & Running from Source

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/sayfbel/ERytmo-Script-Converter.git
   cd ERytmo-Script-Converter
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Application**:
   ```bash
   python src/main_gui.py
   ```

---

## 🔨 Building Executables

### Build Desktop Application Executable (`.exe`)
```bash
python src/build_exe.py
```
*Generates `dist/ERytmo_Script_Converter.exe`.*

### Build Standalone Client Installer (`Setup.exe`)
```bash
python installer/build_installer.py
```
*Generates `installer/Setup_ERytmo_Script_Converter.exe`.*

---

## 📁 Repository Structure

```text
├── src/
│   ├── main_gui.py            # PySide6 Desktop GUI Application
│   ├── script_parser.py       # Core Multi-Format Script Parsing Engine
│   ├── generate_logo.py       # PNG and ICO Logo Asset Generator
│   └── build_exe.py           # PyInstaller Build Script for App Executable
├── installer/
│   ├── installer_gui.py       # Custom PySide6 Client Setup Wizard
│   └── build_installer.py     # PyInstaller Build Script for Setup Executable
├── script company/            # Sample Company Script Input Files
├── script correct formate/    # ERytmo Format A Reference Output Files
├── requirements.txt           # Python Dependency Manifest
├── .gitignore                 # Git Ignore Rules
└── README.md                  # Project Documentation
```

---

## 📜 License

MIT License. Designed for dubbing & subtitling workflow optimization.
