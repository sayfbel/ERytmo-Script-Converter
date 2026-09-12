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

def normalize_header(header_str):
    if not header_str:
        return ""
    return re.sub(r'[^A-Z0-9]', '', header_str.upper())

def is_timecode_cell(text):
    if not text:
        return False
    return bool(re.search(r'\b\d{1,2}:\d{2}:\d{2}(?:[:\.]\d{2})?\b', text))

def extract_timecode(text):
    if not text:
        return ""
    m = re.search(r'\b(\d{1,2}):(\d{2}):(\d{2})(?:[:\.](\d{2}))?\b', text)
    if m:
        hh = int(m.group(1))
        mm = m.group(2)
        ss = m.group(3)
        ff = m.group(4)
        if ff:
            return f"{hh:02d}:{mm}:{ss}:{ff}"
        else:
            return f"{hh:02d}:{mm}:{ss}"
    return ""

def is_numeric_id_column(table, col_idx, data_start):
    """
    Returns True if a column contains mostly numbers/IDs (e.g. 1, 2, 3, 4... or SHOT 1, #1).
    Such columns MUST NEVER be treated as character names or dialogue text.
    """
    if col_idx < 0 or not table.rows:
        return False
    num_rows = len(table.rows) - data_start
    if num_rows <= 0:
        return False
    
    numeric_count = 0
    checked_rows = 0
    for r_idx in range(data_start, len(table.rows)):
        if col_idx < len(table.rows[r_idx].cells):
            txt = table.rows[r_idx].cells[col_idx].text.strip()
            if txt:
                checked_rows += 1
                if re.match(r'^(?:#\s*\d+|\d+|SHOT\s*\d+|TITLE\s*#?\s*\d+)$', txt, re.IGNORECASE):
                    numeric_count += 1
    if checked_rows > 0 and (numeric_count / checked_rows) > 0.5:
        return True
    return False

def is_invalid_character_name(text):
    if not text:
        return True
    if re.match(r'^(?:#?\d+|SHOT\s*\d+|TITLE\s*#?\s*\d+)$', text, re.IGNORECASE):
        return True
    if re.search(r'\b\d{1,2}:\d{2}:\d{2}', text):
        return True
    return False

def extract_speaker_and_dialogue(raw_char, raw_text, last_speaker):
    """
    Extracts a clean character/speaker name and dialogue text.
    Ensures numeric row IDs (1, 2, 3...) and timecodes are NEVER returned as character names.
    """
    speaker = ""
    dialogue = ""

    # 1. Clean raw character cell if present and NOT an invalid character name
    if raw_char:
        cleaned_c = clean_character_name(raw_char)
        if cleaned_c and not is_invalid_character_name(cleaned_c):
            speaker = cleaned_c

    clean_text = raw_text.strip() if raw_text else ""

    # 2. Extract speaker from bracketed/colon tags in raw_text if speaker is empty
    if clean_text:
        # Pattern A: "[Doctor] You understood..." or "[CÉCILE TO MUNA] (shrieks) What are you doing?"
        m_bracket = re.match(r'^\s*\[\s*([A-Z0-9\sÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑÇÃÕÅÆØ\'-]+?)(?:\s+TO\s+[^\]]+|\s*-\s*[^\]]+)?\s*\]\s*(.*)$', clean_text, re.IGNORECASE)
        if m_bracket:
            possible_spk = clean_character_name(m_bracket.group(1))
            if possible_spk and not is_invalid_character_name(possible_spk):
                speaker = possible_spk
                dialogue = m_bracket.group(2).strip()

        # Pattern B: "HANK SCHRADER: Well, we love you, man."
        if not speaker:
            m_colon = re.match(r'^([A-Z0-9\sÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑÇÃÕÅÆØ\'.-]{2,35}):\s*(.*)$', clean_text, re.IGNORECASE)
            if m_colon:
                possible_spk = clean_character_name(m_colon.group(1))
                if possible_spk and not is_invalid_character_name(possible_spk):
                    speaker = possible_spk
                    dialogue = m_colon.group(2).strip()

        # Pattern C: "(WALTER) Dialogue text" (must have text following the closing parenthesis)
        if not speaker:
            m_paren = re.match(r'^\s*\(\s*([A-Z0-9\sÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑÇÃÕÅÆØ\'-]{2,35})\s*\)\s*(.+)$', clean_text, re.IGNORECASE)
            if m_paren:
                possible_spk = clean_character_name(m_paren.group(1))
                if possible_spk and not is_invalid_character_name(possible_spk) and possible_spk not in ["GROANING", "SHRIEKS", "HUMMING", "RUSTLING", "FOOTSTEPS", "EXHALES", "MUSIC", "GIGGLES", "SQUEALS", "CHUCKLES", "LAUGHS", "PAINED BREATHING"]:
                    speaker = possible_spk
                    dialogue = m_paren.group(2).strip()

    if not dialogue:
        dialogue = clean_dialogue(clean_text)

    # 3. Fallback Speaker Continuity
    if not speaker:
        if last_speaker and not is_invalid_character_name(last_speaker):
            speaker = last_speaker
        else:
            if re.match(r'^(?:EXT\.|INT\.|BLACK|YELLOW|HEAD|POV|CU|MCU|MS|LS)\b', dialogue, re.IGNORECASE):
                speaker = "SCENE"
            else:
                speaker = "NARRATOR"

    return speaker, dialogue if dialogue else " "

def parse_docx(file_path):
    log_debug(f"Parsing DOCX file: {file_path}")
    doc = docx.Document(file_path)
    raw_rows = []
    
    if doc.tables:
        table = doc.tables[0]
        
        # 1. Smart Header Row Detection: Find row with maximum distinct column keywords
        best_row_idx = 0
        max_keywords_found = 0
        keywords = ['TIMECODE', 'TIME', 'CODE', 'IN', 'OUT', 'SHOT', 'CHARACTER', 'PERSO', 'PERSONNAGE', 'DIALOGUE', 'DIALOG', 'TITLE', 'SCENE', 'TEXT', 'SPEECH', 'SPEAKER', 'HORODATAGE']

        for r_idx in range(min(6, len(table.rows))):
            cells_text = [c.text.strip() for c in table.rows[r_idx].cells]
            if any(is_timecode_cell(c) for c in cells_text if c):
                continue
                
            found_kw = set()
            for cell_text in cells_text:
                norm_h = normalize_header(cell_text)
                for kw in keywords:
                    if kw in norm_h:
                        found_kw.add(kw)

            if len(found_kw) > max_keywords_found:
                max_keywords_found = len(found_kw)
                best_row_idx = r_idx
                        
        hdr_cells = [c.text.strip() for c in table.rows[best_row_idx].cells]
        norm_hdrs = [normalize_header(c) for c in hdr_cells]

        data_start = best_row_idx + 1
        num_cols = len(table.rows[0].cells) if table.rows else 0
        numeric_id_cols = [c for c in range(num_cols) if is_numeric_id_column(table, c, data_start)]

        tc_in_idx = -1
        tc_out_idx = -1
        char_idx = -1
        text_idx = -1

        for i, norm_h in enumerate(norm_hdrs):
            if norm_h in ['IN', 'TCIN', 'STARTTC', 'START', 'STH', 'HORODATAGE', 'DEBUT', 'TIMEIN', 'TIMESTAMP']:
                tc_in_idx = i
            elif norm_h in ['OUT', 'TCOUT', 'ENDTC', 'END', 'STF', 'FIN', 'TIMEOUT']:
                tc_out_idx = i
            elif any(k in norm_h for k in ['CHARACTER', 'CHARACTERS', 'CHAR', 'PERSO', 'PERSONNAGE', 'SPEAKER', 'ROLE', 'INTERVENANT', 'VOICE', 'VOIX', 'ACTOR', 'NAME']):
                char_idx = i
            elif norm_h in ['TITLE', 'SUBTITLE', 'CAPTION', 'SOUSTITRE']:
                if i not in numeric_id_cols:
                    text_idx = i
            elif any(k in norm_h for k in ['DIALOGUE', 'DIALOG', 'SPEECH', 'TEXT', 'TEXTE', 'SPOKEN', 'CONTENT', 'LINE', 'SCRIPT']):
                if text_idx == -1 and i not in numeric_id_cols:
                    text_idx = i

        if tc_in_idx == -1:
            for i, norm_h in enumerate(norm_hdrs):
                if any(k in norm_h for k in ['TIMECODE', 'TIME', 'CODE', 'TC']):
                    if not any(o in norm_h for o in ['OUT', 'END', 'FIN']):
                        tc_in_idx = i
                        break

        if char_idx in numeric_id_cols:
            char_idx = -1
        if text_idx in numeric_id_cols:
            text_idx = -1

        # DATA-DRIVEN FALLBACK: If tc_in_idx is still -1 or invalid, scan data rows for timecodes per column
        if tc_in_idx == -1 or tc_in_idx >= num_cols:
            col_tc_counts = {}
            for c_idx in range(num_cols):
                if c_idx not in numeric_id_cols:
                    count = 0
                    for r_idx in range(data_start, len(table.rows)):
                        if c_idx < len(table.rows[r_idx].cells):
                            if is_timecode_cell(table.rows[r_idx].cells[c_idx].text):
                                count += 1
                    col_tc_counts[c_idx] = count

            if col_tc_counts:
                best_c = max(col_tc_counts, key=col_tc_counts.get)
                if col_tc_counts[best_c] > 0:
                    tc_in_idx = best_c

        # FALLBACK FOR CHAR_IDX AND TEXT_IDX IF UNMAPPED:
        if tc_in_idx != -1:
            remaining_cols = [c for c in range(num_cols) if c != tc_in_idx and c != tc_out_idx and c not in numeric_id_cols]
            if text_idx == -1 and remaining_cols:
                col_avg_len = {}
                for c in remaining_cols:
                    total_len = sum(len(table.rows[r].cells[c].text.strip()) for r in range(data_start, len(table.rows)) if c < len(table.rows[r].cells))
                    col_avg_len[c] = total_len
                best_text_col = max(col_avg_len, key=col_avg_len.get)
                text_idx = best_text_col
                remaining_cols.remove(best_text_col)
                
            if char_idx == -1 and remaining_cols:
                char_idx = remaining_cols[0]

        last_speaker = ""

        for r_idx in range(data_start, len(table.rows)):
            cells = [c.text.strip().replace("\r", "").replace("\n", " ") for c in table.rows[r_idx].cells]
            if tc_in_idx < 0 or tc_in_idx >= len(cells):
                continue
                
            raw_tc_cell = cells[tc_in_idx]
            tc_in = extract_timecode(raw_tc_cell)
            raw_out_cell = cells[tc_out_idx] if tc_out_idx >= 0 and tc_out_idx < len(cells) else ""
            tc_out = extract_timecode(raw_out_cell) if raw_out_cell else ""
            raw_char = cells[char_idx] if char_idx >= 0 and char_idx < len(cells) else ""
            raw_text = cells[text_idx] if text_idx >= 0 and text_idx < len(cells) else ""
            
            # If raw_text is empty, check remaining non-numeric columns for fallback text (e.g. SCENE DESCRIPTION)
            if not raw_text:
                for alt_c in range(len(cells)):
                    if alt_c not in [tc_in_idx, tc_out_idx, char_idx] and alt_c not in numeric_id_cols:
                        if cells[alt_c]:
                            raw_text = cells[alt_c]
                            break

            if not tc_in:
                continue

            speaker, dialogue = extract_speaker_and_dialogue(raw_char, raw_text, last_speaker)
            if speaker and speaker not in ["SCENE", "NARRATOR"]:
                last_speaker = speaker

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

def safe_validate_and_convert(input_path, output_docx_path=None, export_mode="3line"):
    """
    Safely validates, parses, and converts script.
    Never crashes. Returns (report, raw_rows, format_a_cues).
    export_mode: '3line' (IN only), '4line' (IN & OUT separate lines), 'inline' (IN - OUT combined line)
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
                "out": r.get("out", ""),
                "character": r["character"],
                "dialogue": r["dialogue"]
            })

        # Save to output docx if requested
        if output_docx_path:
            out_doc = docx.Document()
            for idx, cue in enumerate(format_a_cues):
                tc_in = cue["in"]
                tc_out = cue.get("out", "")
                
                if export_mode == "4line" and tc_out:
                    out_doc.add_paragraph(tc_in)
                    out_doc.add_paragraph(tc_out)
                elif export_mode == "inline" and tc_out:
                    out_doc.add_paragraph(f"{tc_in} - {tc_out}")
                else: # '3line' default
                    out_doc.add_paragraph(tc_in)

                out_doc.add_paragraph(cue["character"])
                out_doc.add_paragraph(cue["dialogue"])
                
                if idx < len(format_a_cues) - 1:
                    out_doc.add_paragraph("") # Blank line separator
            out_doc.save(output_docx_path)
            log_debug(f"Saved Format DOCX (export_mode={export_mode}) to: {output_docx_path}")

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

def extract_and_convert(input_path, output_docx_path=None, export_mode="3line"):
    """
    Helper function for direct conversion.
    Returns (raw_rows, format_a_cues).
    """
    report, raw_rows, format_a_cues = safe_validate_and_convert(input_path, output_docx_path, export_mode=export_mode)
    if report.status == ValidationStatus.INVALID:
        raise ScriptImportError(report.user_title, report.user_message, report.suggestion, report.diagnostic_info)
    return raw_rows, format_a_cues
