import os
import re
import traceback
import logging
import docx
from pypdf import PdfReader

from exceptions import (
    ScriptImportError, UnsupportedFormatError, EmptyFileError,
    FileAccessError, FileCorruptedError, NoTimecodesFoundError
)
from script_validator import ScriptValidator, ValidationStatus, ValidationReport

# Configure conversion debug logger
LOG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "conversion_debug.log")
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

def log_debug(message):
    try:
        logging.debug(message)
    except Exception:
        pass

def clean_character_name(raw_name):
    if not raw_name:
        return ""
    name = raw_name.strip().upper()
    name = re.sub(r"\(.*?\)", "", name).strip()
    name = re.sub(r"\b(SPEAKS|ON THE PHONE|OFF SCREEN|ON SCREEN|V\.O\.|O\.S\.|OFF)\b", "", name, flags=re.IGNORECASE).strip()
    name = re.sub(r"\s+", " ", name)
    return name

def clean_dialogue(text):
    if not text:
        return ""
    d = re.sub(r"^\[\s*[A-Z0-9\sÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑÇÃÕÅÆØ'-]+?(?:\s+TO\s+[^\]]+|\s*-\s*[^\]]+)?\s*\]\s*", "", text, flags=re.IGNORECASE).strip()
    return d

def parse_docx(file_path):
    log_debug(f"Parsing DOCX file: {file_path}")
    doc = docx.Document(file_path)
    raw_rows = []
    
    if doc.tables:
        table = doc.tables[0]
        
        # 1. Smart Header Row Detection: Find row with maximum distinct column keywords
        best_row_idx = 0
        max_keywords_found = 0
        keywords = ['IN', 'OUT', 'TIMECODE', 'SHOT', 'CHARACTER', 'PERSO', 'DIALOGUE', 'TITLE', 'SCENE', 'TEXT', 'SPEECH', 'PERS']

        for r_idx in range(min(6, len(table.rows))):
            cells_upper = [c.text.strip().upper() for c in table.rows[r_idx].cells]
            if any(re.match(r'^\d{2}:\d{2}:\d{2}', c) for c in cells_upper if c):
                continue
                
            found_kw = set()
            for cell_text in cells_upper:
                for kw in keywords:
                    if kw in cell_text:
                        found_kw.add(kw)
                        
            if len(found_kw) > max_keywords_found:
                max_keywords_found = len(found_kw)
                best_row_idx = r_idx

        hdr_cells = [c.text.strip().upper() for c in table.rows[best_row_idx].cells]
        
        tc_in_idx = -1
        tc_out_idx = -1
        char_idx = -1
        text_idx = -1

        for i, h in enumerate(hdr_cells):
            if h in ['IN', 'TC IN', 'TCIN', 'START', 'START TC', 'STH']:
                tc_in_idx = i
            elif h in ['OUT', 'TC OUT', 'TCOUT', 'END', 'END TC', 'STF']:
                tc_out_idx = i
            elif any(k in h for k in ['CHARACTER', 'CHARACTERS', 'PERSO', 'SPEAKER', 'PERSONNAGE', 'VOICE']):
                char_idx = i
            elif h in ['TITLE', 'TITLE #']:
                if text_idx == -1 or hdr_cells[text_idx] not in ['TITLE']:
                    text_idx = i
            elif any(k in h for k in ['DIALOGUE', 'DIALOG', 'TEXT', 'TEXTE', 'SPEECH']):
                if text_idx == -1:
                    text_idx = i

        if tc_in_idx == -1:
            for i, h in enumerate(hdr_cells):
                if 'TIMECODE' in h or 'TC' in h:
                    tc_in_idx = i
                    break

        data_start = best_row_idx + 1
        last_speaker = ""

        for r_idx in range(data_start, len(table.rows)):
            cells = [c.text.strip().replace("\r", "").replace("\n", " ") for c in table.rows[r_idx].cells]
            if tc_in_idx < 0 or tc_in_idx >= len(cells):
                continue
                
            tc_in = cells[tc_in_idx]
            tc_out = cells[tc_out_idx] if tc_out_idx >= 0 and tc_out_idx < len(cells) else ""
            raw_char = cells[char_idx] if char_idx >= 0 and char_idx < len(cells) else ""
            raw_text = cells[text_idx] if text_idx >= 0 and text_idx < len(cells) else ""
            
            if not tc_in or not re.match(r"^\d{2}:\d{2}:\d{2}", tc_in):
                continue

            speaker = clean_character_name(raw_char) if raw_char else ""
            if not speaker and raw_text:
                m = re.match(r"^\[\s*([A-Z0-9\sÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑÇÃÕÅÆØ'-]+?)(?:\s+TO\s+[^\]]+|\s*-\s*[^\]]+)?\s*\]", raw_text, re.IGNORECASE)
                if m:
                    speaker = clean_character_name(m.group(1))

            if speaker:
                last_speaker = speaker
            else:
                speaker = last_speaker

            dialogue = clean_dialogue(raw_text)
            if not dialogue:
                dialogue = " "

            raw_rows.append({
                "in": tc_in,
                "out": tc_out,
                "character": speaker if speaker else "CHARACTER",
                "dialogue": dialogue
            })

    else:
        text_lines = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        raw_rows = parse_plain_lines(text_lines)

    return raw_rows

def parse_pdf(file_path):
    log_debug(f"Parsing PDF file: {file_path}")
    reader = PdfReader(file_path)
    lines = []
    for page in reader.pages:
        txt = page.extract_text()
        if txt:
            for line in txt.split("\n"):
                if line.strip():
                    lines.append(line.strip())
    return parse_plain_lines(lines)

def parse_txt(file_path):
    log_debug(f"Parsing TXT file: {file_path}")
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = [l.strip() for l in f.readlines() if l.strip()]
    return parse_plain_lines(lines)

def parse_plain_lines(lines):
    raw_rows = []
    i = 0
    while i < len(lines):
        line = lines[i]
        m_tc = re.match(r"^(\d{2}:\d{2}:\d{2}(?:[:\.]\d{2})?)", line)
        if m_tc:
            tc_in = m_tc.group(1)
            i += 1
            
            tc_out = ""
            if i < len(lines) and re.match(r"^\d{2}:\d{2}:\d{2}", lines[i]):
                tc_out = lines[i]
                i += 1
                
            speaker = ""
            if i < len(lines):
                speaker = clean_character_name(lines[i])
                i += 1
                
            speech_lines = []
            while i < len(lines) and not re.match(r"^\d{2}:\d{2}:\d{2}", lines[i]):
                speech_lines.append(lines[i])
                i += 1
                
            dialogue = clean_dialogue(" ".join(speech_lines))
            raw_rows.append({
                "in": tc_in,
                "out": tc_out,
                "character": speaker if speaker else "CHARACTER",
                "dialogue": dialogue if dialogue else " "
            })
        else:
            i += 1
            
    return raw_rows

def safe_validate_and_convert(input_path, output_docx_path=None):
    """
    Safely validates, parses, and converts script.
    Never crashes. Returns (report, raw_rows, format_a_cues).
    """
    log_debug(f"--- Starting Validation & Import for: {input_path} ---")
    
    # 1. Run Pre-Validation
    report = ScriptValidator.validate_file(input_path)
    
    if report.status == ValidationStatus.INVALID:
        log_debug(f"Validation Failed: {report.user_title} - {report.user_message}")
        return report, [], []

    # 2. Perform Extraction
    ext = os.path.splitext(input_path)[1].lower()
    try:
        if ext == ".docx":
            raw_rows = parse_docx(input_path)
        elif ext == ".pdf":
            raw_rows = parse_pdf(input_path)
        elif ext in [".txt", ".text"]:
            raw_rows = parse_txt(input_path)
        else:
            raise UnsupportedFormatError(ext)

        if not raw_rows:
            raise NoTimecodesFoundError(os.path.basename(input_path))

        format_a_cues = []
        for r in raw_rows:
            format_a_cues.append({
                "in": r["in"],
                "character": r["character"],
                "dialogue": r["dialogue"]
            })

        # Save to output docx if requested
        if output_docx_path:
            out_doc = docx.Document()
            for idx, cue in enumerate(format_a_cues):
                out_doc.add_paragraph(cue["in"])
                out_doc.add_paragraph(cue["character"])
                out_doc.add_paragraph(cue["dialogue"])
                if idx < len(format_a_cues) - 1:
                    out_doc.add_paragraph("") # Blank line separator
            out_doc.save(output_docx_path)
            log_debug(f"Saved Format A DOCX to: {output_docx_path}")

        log_debug(f"Successfully processed {len(raw_rows)} cues. Status: {report.status}")
        return report, raw_rows, format_a_cues

    except ScriptImportError as e:
        tb = traceback.format_exc()
        log_debug(f"ScriptImportError Caught:\n{tb}")
        report.status = ValidationStatus.INVALID
        report.user_title = e.user_title
        report.user_message = e.user_message
        report.suggestion = e.suggestion
        report.diagnostic_info += f"\n\nException:\n{tb}"
        return report, [], []

    except Exception as e:
        tb = traceback.format_exc()
        log_debug(f"Unexpected Exception Caught:\n{tb}")
        report.status = ValidationStatus.INVALID
        report.user_title = "Unable to Understand Script Format"
        report.user_message = "An unexpected error occurred while parsing the script content."
        report.suggestion = "The structure of this script is currently not supported by the importer. Please check the required format and try importing your script again. If you believe the format should be supported, please contact Support."
        report.diagnostic_info += f"\n\nUnexpected Exception:\n{tb}"
        return report, [], []
