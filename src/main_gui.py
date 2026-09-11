import os
import sys
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QFileDialog, QTableWidget, QTableWidgetItem, QHeaderView,
    QProgressBar, QFrame, QSplitter, QMessageBox
)
from PySide6.QtCore import Qt, QThread, Signal
from PySide6.QtGui import QIcon, QPixmap, QFont, QColor

# Import script parser
from script_parser import extract_and_convert

class ParseThread(QThread):
    finished_signal = Signal(bool, object, object, str)

    def __init__(self, input_path):
        super().__init__()
        self.input_path = input_path

    def run(self):
        try:
            raw_rows, format_a_cues = extract_and_convert(self.input_path)
            self.finished_signal.emit(True, raw_rows, format_a_cues, "")
        except Exception as e:
            self.finished_signal.emit(False, None, None, str(e))

class DropAreaWidget(QFrame):
    file_dropped_signal = Signal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAcceptDrops(True)
        self.setObjectName("DropArea")

    def dragEnterEvent(self, event):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()

    def dropEvent(self, event):
        urls = event.mimeData().urls()
        if urls:
            file_path = urls[0].toLocalFile()
            ext = os.path.splitext(file_path)[1].lower()
            if ext in [".docx", ".pdf", ".txt", ".text"]:
                self.file_dropped_signal.emit(file_path)

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.selected_file_path = None
        self.raw_rows = []
        self.format_a_cues = []

        self.setWindowTitle("ERytmo Script Converter")
        self.resize(1080, 720)
        self.setMinimumSize(900, 650)

        # Set Window Icon
        base_dir = os.path.dirname(os.path.abspath(__file__))
        logo_png = os.path.join(base_dir, "app_logo.png")
        logo_ico = os.path.join(base_dir, "app_logo.ico")
        if os.path.exists(logo_ico):
            self.setWindowIcon(QIcon(logo_ico))
        elif os.path.exists(logo_png):
            self.setWindowIcon(QIcon(logo_png))

        self.init_ui(logo_png)

    def init_ui(self, logo_path):
        # Global Light Mode Stylesheet
        self.setStyleSheet("""
            QMainWindow {
                background-color: #F8FAFC;
            }
            QWidget {
                font-family: 'Segoe UI', Arial, sans-serif;
                color: #0F172A;
            }
            QFrame#HeaderFrame {
                background-color: #FFFFFF;
                border-bottom: 1px solid #E2E8F0;
            }
            QFrame#DropArea {
                background-color: #FFFFFF;
                border: 2px dashed #CBD5E1;
                border-radius: 12px;
            }
            QFrame#DropArea:hover {
                border-color: #2563EB;
                background-color: #F1F5F9;
            }
            QFrame#CardFrame {
                background-color: #FFFFFF;
                border: 1px solid #E2E8F0;
                border-radius: 10px;
            }
            QPushButton#PrimaryButton {
                background-color: #2563EB;
                color: #FFFFFF;
                font-size: 14px;
                font-weight: bold;
                border-radius: 8px;
                padding: 10px 20px;
                border: none;
            }
            QPushButton#PrimaryButton:hover {
                background-color: #1D4ED8;
            }
            QPushButton#PrimaryButton:disabled {
                background-color: #94A3B8;
            }
            QPushButton#DownloadButton {
                background-color: #10B981;
                color: #FFFFFF;
                font-size: 14px;
                font-weight: bold;
                border-radius: 8px;
                padding: 10px 22px;
                border: none;
            }
            QPushButton#DownloadButton:hover {
                background-color: #059669;
            }
            QPushButton#DownloadButton:disabled {
                background-color: #A7F3D0;
                color: #065F46;
            }
            QPushButton#SecondaryButton {
                background-color: #FFFFFF;
                color: #334155;
                font-size: 13px;
                font-weight: 600;
                border-radius: 8px;
                padding: 8px 16px;
                border: 1px solid #CBD5E1;
            }
            QPushButton#SecondaryButton:hover {
                background-color: #F1F5F9;
            }
            QTableWidget {
                background-color: #FFFFFF;
                border: 1px solid #E2E8F0;
                border-radius: 8px;
                gridline-color: #F1F5F9;
                font-size: 12px;
                color: #0F172A;
            }
            QTableWidget::item {
                padding: 6px;
            }
            QHeaderView::section {
                background-color: #F1F5F9;
                color: #334155;
                font-weight: bold;
                border: none;
                border-bottom: 1px solid #CBD5E1;
                padding: 8px;
            }
            QProgressBar {
                border: none;
                background-color: #E2E8F0;
                height: 4px;
                border-radius: 2px;
            }
            QProgressBar::chunk {
                background-color: #2563EB;
            }
        """)

        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # 1. Header Frame
        header_frame = QFrame()
        header_frame.setObjectName("HeaderFrame")
        header_layout = QHBoxLayout(header_frame)
        header_layout.setContentsMargins(20, 14, 20, 14)

        if os.path.exists(logo_path):
            logo_label = QLabel()
            pix = QPixmap(logo_path).scaled(40, 40, Qt.KeepAspectRatio, Qt.SmoothTransformation)
            logo_label.setPixmap(pix)
            header_layout.addWidget(logo_label)

        title_box = QVBoxLayout()
        title_label = QLabel("ERytmo Script Converter")
        title_label.setFont(QFont("Segoe UI", 15, QFont.Bold))
        title_label.setStyleSheet("color: #0F172A;")

        subtitle_label = QLabel("Convert Company Scripts (.docx, .pdf, .txt) into ERytmo Format A DOCX")
        subtitle_label.setFont(QFont("Segoe UI", 9))
        subtitle_label.setStyleSheet("color: #64748B;")

        title_box.addWidget(title_label)
        title_box.addWidget(subtitle_label)
        header_layout.addLayout(title_box)
        header_layout.addStretch()

        main_layout.addWidget(header_frame)

        # 2. Main Content Body
        body_widget = QWidget()
        body_layout = QVBoxLayout(body_widget)
        body_layout.setContentsMargins(20, 16, 20, 16)
        body_layout.setSpacing(12)

        # Top Control Row (Drop Area + Selected File Card)
        top_row = QHBoxLayout()
        top_row.setSpacing(12)

        # Drop Area Frame
        self.drop_area = DropAreaWidget()
        drop_layout = QVBoxLayout(self.drop_area)
        drop_layout.setContentsMargins(16, 12, 16, 12)
        drop_layout.setAlignment(Qt.AlignCenter)

        drop_text_label = QLabel("Drag & Drop Script File (.docx, .pdf, .txt)")
        drop_text_label.setFont(QFont("Segoe UI", 11, QFont.Bold))
        drop_text_label.setStyleSheet("color: #334155;")
        drop_text_label.setAlignment(Qt.AlignCenter)

        browse_btn = QPushButton("Browse File...")
        browse_btn.setObjectName("SecondaryButton")
        browse_btn.setCursor(Qt.PointingHandCursor)
        browse_btn.clicked.connect(self.on_browse_clicked)

        drop_layout.addWidget(drop_text_label)
        drop_layout.addWidget(browse_btn, 0, Qt.AlignCenter)
        self.drop_area.file_dropped_signal.connect(self.on_file_selected)

        top_row.addWidget(self.drop_area, 2)

        # File Status Card & Download Button Box
        self.file_card = QFrame()
        self.file_card.setObjectName("CardFrame")
        card_layout = QVBoxLayout(self.file_card)
        card_layout.setContentsMargins(16, 12, 16, 12)

        self.file_name_label = QLabel("No File Loaded")
        self.file_name_label.setFont(QFont("Segoe UI", 11, QFont.Bold))
        self.file_name_label.setStyleSheet("color: #64748B;")

        self.cue_count_label = QLabel("Select or drop a script file to preview.")
        self.cue_count_label.setFont(QFont("Segoe UI", 9))
        self.cue_count_label.setStyleSheet("color: #64748B;")

        # Download / Save Button
        self.download_btn = QPushButton("📥 Download Converted DOCX")
        self.download_btn.setObjectName("DownloadButton")
        self.download_btn.setCursor(Qt.PointingHandCursor)
        self.download_btn.setEnabled(False)
        self.download_btn.clicked.connect(self.on_download_clicked)

        card_layout.addWidget(self.file_name_label)
        card_layout.addWidget(self.cue_count_label)
        card_layout.addStretch()
        card_layout.addWidget(self.download_btn)

        top_row.addWidget(self.file_card, 1)

        body_layout.addLayout(top_row)

        # Progress Bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 0)
        self.progress_bar.setVisible(False)
        body_layout.addWidget(self.progress_bar)

        # 3. Two Side-by-Side Tables (Splitter)
        tables_splitter = QSplitter(Qt.Horizontal)

        # Table 1: Original Imported Script
        t1_box = QWidget()
        t1_layout = QVBoxLayout(t1_box)
        t1_layout.setContentsMargins(0, 0, 0, 0)
        t1_label = QLabel("1. Original Imported Script (Raw)")
        t1_label.setFont(QFont("Segoe UI", 10, QFont.Bold))
        t1_label.setStyleSheet("color: #1E293B;")
        
        self.table_raw = QTableWidget()
        self.table_raw.setColumnCount(4)
        self.table_raw.setHorizontalHeaderLabels(["IN", "OUT", "Character", "Dialogue / Text"])
        self.table_raw.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeToContents)
        self.table_raw.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeToContents)
        self.table_raw.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeToContents)
        self.table_raw.horizontalHeader().setSectionResizeMode(3, QHeaderView.Stretch)
        
        t1_layout.addWidget(t1_label)
        t1_layout.addWidget(self.table_raw)

        # Table 2: Converted ERytmo Format A Script
        t2_box = QWidget()
        t2_layout = QVBoxLayout(t2_box)
        t2_layout.setContentsMargins(0, 0, 0, 0)
        t2_label = QLabel("2. Converted ERytmo Format A Script (Output Preview)")
        t2_label.setFont(QFont("Segoe UI", 10, QFont.Bold))
        t2_label.setStyleSheet("color: #166534;")
        
        self.table_converted = QTableWidget()
        self.table_converted.setColumnCount(3)
        self.table_converted.setHorizontalHeaderLabels(["Line 1 (IN Timecode)", "Line 2 (Character Name)", "Line 3+ (Dialogue Text)"])
        self.table_converted.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeToContents)
        self.table_converted.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeToContents)
        self.table_converted.horizontalHeader().setSectionResizeMode(2, QHeaderView.Stretch)

        t2_layout.addWidget(t2_label)
        t2_layout.addWidget(self.table_converted)

        tables_splitter.addWidget(t1_box)
        tables_splitter.addWidget(t2_box)
        tables_splitter.setSizes([500, 500])

        body_layout.addWidget(tables_splitter, 1)

        main_layout.addWidget(body_widget)

    def on_browse_clicked(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "Select Company Script File",
            "",
            "Supported Script Files (*.docx *.pdf *.txt *.text);;Word Documents (*.docx);;PDF Files (*.pdf);;Text Files (*.txt *.text)"
        )
        if file_path:
            self.on_file_selected(file_path)

    def on_file_selected(self, file_path):
        self.selected_file_path = file_path
        self.file_name_label.setText(os.path.basename(file_path))
        self.file_name_label.setStyleSheet("color: #0F172A;")
        self.cue_count_label.setText("Extracting dialogue cues...")
        self.progress_bar.setVisible(True)
        self.download_btn.setEnabled(False)

        # Run extraction in background thread
        self.thread = ParseThread(file_path)
        self.thread.finished_signal.connect(self.on_parse_finished)
        self.thread.start()

    def on_parse_finished(self, success, raw_rows, format_a_cues, error_msg):
        self.progress_bar.setVisible(False)

        if not success:
            QMessageBox.critical(self, "Error Reading Script", f"Could not parse script file:\n{error_msg}")
            self.cue_count_label.setText("Error reading file.")
            return

        self.raw_rows = raw_rows
        self.format_a_cues = format_a_cues

        # Update Cue Count Label
        self.cue_count_label.setText(f"Loaded {len(raw_rows)} dialogue cues cleanly.")
        self.download_btn.setEnabled(True)

        # Populate Table 1: Raw Imported Script
        self.table_raw.setRowCount(len(raw_rows))
        for r_idx, r in enumerate(raw_rows):
            self.table_raw.setItem(r_idx, 0, QTableWidgetItem(r["in"]))
            self.table_raw.setItem(r_idx, 1, QTableWidgetItem(r["out"]))
            self.table_raw.setItem(r_idx, 2, QTableWidgetItem(r["character"]))
            self.table_raw.setItem(r_idx, 3, QTableWidgetItem(r["dialogue"]))

        # Populate Table 2: Converted Format A Script
        self.table_converted.setRowCount(len(format_a_cues))
        for r_idx, c in enumerate(format_a_cues):
            item_in = QTableWidgetItem(c["in"])
            item_char = QTableWidgetItem(c["character"])
            item_diag = QTableWidgetItem(c["dialogue"])
            
            # Highlight character names in soft green
            item_char.setForeground(QColor("#166534"))
            item_char.setFont(QFont("Segoe UI", 9, QFont.Bold))

            self.table_converted.setItem(r_idx, 0, item_in)
            self.table_converted.setItem(r_idx, 1, item_char)
            self.table_converted.setItem(r_idx, 2, item_diag)

    def on_download_clicked(self):
        if not self.selected_file_path or not self.format_a_cues:
            return

        base_name = os.path.splitext(os.path.basename(self.selected_file_path))[0]
        default_out_name = f"{base_name}_ERytmo_FormatA.docx"
        
        default_dir = os.path.dirname(self.selected_file_path)
        default_path = os.path.join(default_dir, default_out_name)

        output_path, _ = QFileDialog.getSaveFileName(
            self,
            "Save Converted Format A DOCX Script",
            default_path,
            "Word Documents (*.docx)"
        )

        if output_path:
            try:
                extract_and_convert(self.selected_file_path, output_path)
                
                msg_box = QMessageBox(self)
                msg_box.setWindowTitle("Conversion Successful")
                msg_box.setText(f"File saved successfully!\n\nLocation: {output_path}")
                open_btn = msg_box.addButton("Open DOCX File", QMessageBox.ActionRole)
                folder_btn = msg_box.addButton("Open Folder", QMessageBox.ActionRole)
                msg_box.addButton(QMessageBox.Close)
                
                msg_box.exec()

                if msg_box.clickedButton() == open_btn:
                    os.startfile(output_path)
                elif msg_box.clickedButton() == folder_btn:
                    os.startfile(os.path.dirname(output_path))
            except Exception as e:
                QMessageBox.critical(self, "Error Saving File", f"Failed to save file:\n{str(e)}")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
