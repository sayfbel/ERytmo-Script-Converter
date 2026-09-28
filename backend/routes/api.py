from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from google import genai
from datetime import datetime
import os

from backend.database.database import get_db
from backend.models import models
from backend.routes.auth import get_current_user

router = APIRouter()

@router.get("/companies")
def get_companies(db: Session = Depends(get_db)):
    return db.query(models.Company).all()

@router.post("/companies")
def create_company(
    name: str, 
    description: str = None, 
    rate_detection: float = None,
    rate_conformation: float = None,
    rate_pose_texte: float = None,
    rate_chantant: float = None,
    supplier_email: str = None,
    target_software: str = None,
    db: Session = Depends(get_db)
):
    db_company = models.Company(
        name=name, 
        description=description,
        rate_detection=rate_detection,
        rate_conformation=rate_conformation,
        rate_pose_texte=rate_pose_texte,
        rate_chantant=rate_chantant,
        supplier_email=supplier_email,
        target_software=target_software
    )
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

@router.put("/companies/{company_id}")
def update_company(
    company_id: int,
    name: str = None,
    description: str = None,
    rate_detection: float = None,
    rate_conformation: float = None,
    rate_pose_texte: float = None,
    rate_chantant: float = None,
    supplier_email: str = None,
    target_software: str = None,
    db: Session = Depends(get_db)
):
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    if name is not None: company.name = name
    if description is not None: company.description = description
    if rate_detection is not None: company.rate_detection = rate_detection
    if rate_conformation is not None: company.rate_conformation = rate_conformation
    if rate_pose_texte is not None: company.rate_pose_texte = rate_pose_texte
    if rate_chantant is not None: company.rate_chantant = rate_chantant
    if supplier_email is not None: company.supplier_email = supplier_email
    if target_software is not None: company.target_software = target_software
    
    db.commit()
    db.refresh(company)
    return company

@router.delete("/companies/{company_id}")
def delete_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    db.delete(company)
    db.commit()
    return {"message": "Company deleted successfully"}

# --- User Search Endpoint ---

@router.get("/users/search")
def search_users(
    q: str = "",
    limit: int = 15,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Search registered users by first name, last name, full name, or email.
    Used by the Staff management page to find user accounts and add/link them as staff.
    """
    query = q.strip().lower()
    users_query = db.query(models.User)
    
    if query:
        tokens = query.split()
        if len(tokens) >= 2:
            first_part, second_part = tokens[0], tokens[1]
            users_query = users_query.filter(
                (
                    models.User.first_name.ilike(f"%{first_part}%") & 
                    models.User.last_name.ilike(f"%{second_part}%")
                ) | (
                    models.User.first_name.ilike(f"%{second_part}%") & 
                    models.User.last_name.ilike(f"%{first_part}%")
                ) | (
                    models.User.email.ilike(f"%{query}%")
                )
            )
        else:
            term = f"%{query}%"
            users_query = users_query.filter(
                models.User.first_name.ilike(term) |
                models.User.last_name.ilike(term) |
                models.User.email.ilike(term)
            )
    
    users = users_query.limit(limit).all()
    
    return [
        {
            "id": u.id,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "name": f"{u.first_name} {u.last_name}".strip(),
            "email": u.email,
            "phone_number": u.phone_number
        }
        for u in users
    ]

# --- Staff Endpoints ---

@router.get("/staff")
def get_staff(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    staff_list = db.query(models.Staff).filter(
        (models.Staff.user_id == current_user.id) | (models.Staff.user_id == None)
    ).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "task": s.task,
            "staff_user_id": s.staff_user_id,
            "created_at": s.created_at.isoformat() if s.created_at else None
        }
        for s in staff_list
    ]

@router.post("/staff")
def create_staff(
    name: str,
    email: str = None,
    task: str = None,
    staff_user_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_staff = models.Staff(
        user_id=current_user.id,
        staff_user_id=staff_user_id if staff_user_id and staff_user_id > 0 else None,
        name=name,
        email=email,
        task=task
    )
    db.add(db_staff)
    db.commit()
    db.refresh(db_staff)
    return {
        "id": db_staff.id,
        "name": db_staff.name,
        "email": db_staff.email,
        "task": db_staff.task,
        "staff_user_id": db_staff.staff_user_id,
        "created_at": db_staff.created_at.isoformat() if db_staff.created_at else None
    }

@router.put("/staff/{staff_id}")
def update_staff(
    staff_id: int,
    name: str = None,
    email: str = None,
    task: str = None,
    staff_user_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    staff = db.query(models.Staff).filter(
        models.Staff.id == staff_id,
        (models.Staff.user_id == current_user.id) | (models.Staff.user_id == None)
    ).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
        
    if name is not None: staff.name = name
    if email is not None: staff.email = email
    if task is not None: staff.task = task
    if staff_user_id is not None:
        staff.staff_user_id = staff_user_id if staff_user_id > 0 else None
    staff.user_id = current_user.id
    
    db.commit()
    db.refresh(staff)
    return {
        "id": staff.id,
        "name": staff.name,
        "email": staff.email,
        "task": staff.task,
        "staff_user_id": staff.staff_user_id,
        "created_at": staff.created_at.isoformat() if staff.created_at else None
    }

@router.delete("/staff/{staff_id}")
def delete_staff(
    staff_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    staff = db.query(models.Staff).filter(
        models.Staff.id == staff_id,
        (models.Staff.user_id == current_user.id) | (models.Staff.user_id == None)
    ).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
        
    db.delete(staff)
    db.commit()
    return {"message": "Staff deleted successfully"}

# --- Project Endpoints (User-Scoped) ---

@router.get("/projects")
def get_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Auto-assign legacy unassigned projects to current user
    unassigned = db.query(models.Project).filter(models.Project.user_id == None).all()
    if unassigned:
        for p in unassigned:
            p.user_id = current_user.id
        db.commit()

    return db.query(models.Project).filter(models.Project.user_id == current_user.id).all()

import tkinter as tk
from tkinter import filedialog

@router.get("/browse-folder")
def browse_folder():
    try:
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        folder_path = filedialog.askdirectory(parent=root, title="Select Project Folder")
        root.destroy()
        return {"path": folder_path}
    except Exception as e:
        print(f"Error opening folder dialog: {e}")
        return {"path": ""}

@router.post("/projects")
def create_project(
    name: str, 
    company_name: str = None, 
    folder_path: str = None, 
    target_software: str = None, 
    project_type: str = None,
    deadline: str = None, 
    company_id: int = None, 
    total_time: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    dl_dt = None
    if deadline:
        try:
            dl_dt = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
        except:
            pass

    db_project = models.Project(
        user_id=current_user.id,
        name=name, 
        company_id=company_id,
        company_name=company_name,
        folder_path=folder_path,
        target_software=target_software,
        project_type=project_type,
        deadline=dl_dt,
        total_time=total_time
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.put("/projects/{project_id}")
def update_project(
    project_id: int,
    name: str = None, 
    company_name: str = None, 
    folder_path: str = None, 
    target_software: str = None, 
    project_type: str = None,
    deadline: str = None, 
    total_time: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if name is not None: project.name = name
    if company_name is not None: project.company_name = company_name
    if folder_path is not None: project.folder_path = folder_path
    if target_software is not None: project.target_software = target_software
    if project_type is not None: project.project_type = project_type
    if total_time is not None: project.total_time = total_time
    if deadline is not None:
        try:
            project.deadline = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
        except:
            pass
            
    db.commit()
    db.refresh(project)
    return project

@router.delete("/projects/{project_id}")
def delete_project(
    project_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}

@router.get("/projects/{project_id}/files")
def get_project_files(
    project_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.folder_path or not os.path.exists(project.folder_path):
        return []

    files_list = []
    try:
        for filename in os.listdir(project.folder_path):
            file_path = os.path.join(project.folder_path, filename)
            if os.path.isfile(file_path):
                ext = os.path.splitext(filename)[1].lower()
                is_video = ext in ['.mp4', '.mkv', '.avi', '.mov', '.wmv']
                is_script = ext in ['.txt', '.srt', '.doc', '.docx', '.pdf']
                
                if is_video or is_script:
                    size_bytes = os.path.getsize(file_path)
                    files_list.append({
                        "name": filename,
                        "path": file_path,
                        "type": "video" if is_video else "script",
                        "size": size_bytes
                    })
    except Exception as e:
        print(f"Error reading folder: {e}")
        
    return files_list

@router.get("/stream-file")
def stream_file(path: str):
    import os
    if not os.path.exists(path) or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File not found on local machine")
    
    # We use FileResponse because it supports Range requests automatically in Starlette
    # and properly sets the Accept-Ranges header for video streaming.
    return FileResponse(path)

@router.get("/appointments")
def get_appointments(db: Session = Depends(get_db)):
    return db.query(models.Appointment).all()

from datetime import datetime

@router.post("/appointments")
def create_appointment(
    title: str, 
    type: str, 
    start_time: str, 
    end_time: str, 
    db: Session = Depends(get_db)
):
    try:
        start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format.")
        
    db_appointment = models.Appointment(
        title=title, 
        type=type,
        start_time=start_dt,
        end_time=end_dt
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

import os
import json
import tempfile
from fastapi import UploadFile, File, Form
from fastapi.responses import FileResponse
from backend.services.script_parser import safe_validate_and_convert, align_timecodes_with_gemini
from backend.services.script_validator import ValidationStatus

@router.post("/convert")
async def convert_script(file: UploadFile = File(...)):
    # Save uploaded file to a temporary location
    try:
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_path = temp_file.name
            while chunk := await file.read(1024 * 1024):
                temp_file.write(chunk)
        
        # Process the file
        report, raw_rows, format_a_cues = safe_validate_and_convert(temp_path)
        
        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        if report.status == ValidationStatus.INVALID:
            raise HTTPException(status_code=400, detail={"title": report.user_title, "message": report.user_message, "suggestion": getattr(report, 'suggestion', '')})
            
        return {
            "success": True,
            "filename": file.filename,
            "raw_rows": raw_rows,
            "cues": format_a_cues
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/align")
async def align_script(
    cues: str = Form(...), 
    start_tc: str = Form(...), 
    media: UploadFile = File(...)
):
    try:
        # Save media file in chunks
        suffix = os.path.splitext(media.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_media:
            temp_media_path = temp_media.name
            while chunk := await media.read(1024 * 1024):
                temp_media.write(chunk)
            
        parsed_cues = json.loads(cues)
        generator = align_timecodes_with_gemini(parsed_cues, temp_media_path, start_tc)
        
        aligned_cues = list(generator)
        
        if os.path.exists(temp_media_path):
            os.remove(temp_media_path)
            
        return {"success": True, "aligned_cues": aligned_cues}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def create_mosaic_excel(parsed_cues, filename: str = None):
    import openpyxl
    from openpyxl.styles import Font, Alignment
    from datetime import datetime
    import re
    
    wb = openpyxl.Workbook()
    
    # 1. Sheet: Dialogue List
    ws_dialogue = wb.active
    ws_dialogue.title = "Dialogue List"
    
    header_font = Font(name="Calibri", size=13, bold=True)
    data_font = Font(name="Calibri", size=11, bold=False)
    summary_header_font = Font(name="Calibri", size=13, bold=True)
    summary_total_font = Font(name="Calibri", size=11, bold=True)
    project_label_font = Font(name="Calibri", size=13, bold=True)
    project_val_font = Font(name="Calibri", size=11, bold=False)
    
    dialogue_headers = [
        ('IN-TIMECODE', 31.29),
        ('OUT-TIMECODE', 13.0),
        ('SOURCE', 13.0),
        ('TRANSCRIPTION', 93.71),
        ('ANNOTATIONS', 13.0),
        ('TAGS', 31.29),
        ('SOURCE ONSCREEN', 13.0),
        ('FN TREATMENT', 13.0),
        ('FN POSITION', 13.0)
    ]
    
    for col_idx, (hdr, width) in enumerate(dialogue_headers, start=1):
        col_letter = openpyxl.utils.get_column_letter(col_idx)
        ws_dialogue.column_dimensions[col_letter].width = width
        cell = ws_dialogue.cell(row=1, column=col_idx, value=hdr)
        cell.font = header_font
        
    char_counts = {}
    last_out_tc = ""
    
    for row_idx, cue in enumerate(parsed_cues, start=2):
        in_tc = str(cue.get("in", "") or "").strip()
        out_tc = str(cue.get("out", "") or "").strip()
        if out_tc:
            last_out_tc = out_tc
        elif in_tc and not last_out_tc:
            last_out_tc = in_tc
            
        character = str(cue.get("character", "") or "").strip()
        dialogue = str(cue.get("dialogue", "") or "")
        annotations = str(cue.get("annotations", "") or "").strip()
        tags = str(cue.get("tags", "") or "").strip()
        source_onscreen = str(cue.get("source_onscreen", "") or "").strip()
        if not source_onscreen and character:
            source_onscreen = "ON"
        fn_treatment = str(cue.get("fn_treatment", "") or "").strip()
        fn_position = str(cue.get("fn_position", "") or "bottom").strip()
        if not fn_position:
            fn_position = "bottom"
            
        row_vals = [
            in_tc,
            out_tc,
            character,
            dialogue,
            annotations,
            tags,
            source_onscreen,
            fn_treatment,
            fn_position
        ]
        
        for col_idx, val in enumerate(row_vals, start=1):
            cell = ws_dialogue.cell(row=row_idx, column=col_idx, value=val)
            cell.font = data_font
            if col_idx == 4:  # TRANSCRIPTION
                cell.alignment = Alignment(wrap_text=True)
                
        # Word counts tracking
        if character:
            if character not in char_counts:
                char_counts[character] = {
                    "dialog": 0.0,
                    "transcription": 0.0,
                    "foreign": 0.0,
                    "music": 0.0,
                    "burnedin": 0.0,
                    "onscreen": 0.0,
                    "total": 0.0
                }
            words = float(len(re.findall(r'\b\w+\b', dialogue))) if dialogue else 0.0
            tags_upper = tags.upper()
            if "SONG" in tags_upper or "MUSIC" in tags_upper:
                char_counts[character]["music"] += words
            elif "FOREIGN" in tags_upper:
                char_counts[character]["foreign"] += words
            elif "BURNEDIN" in tags_upper or "SUBTITLE" in tags_upper:
                char_counts[character]["burnedin"] += words
            elif "ONSCREEN" in tags_upper or "TITLE" in tags_upper:
                char_counts[character]["onscreen"] += words
            else:
                char_counts[character]["dialog"] += words
            
            if dialogue.strip().startswith("[") and dialogue.strip().endswith("]"):
                char_counts[character]["transcription"] += words
                
            char_counts[character]["total"] += words

    # 2. Sheet: Word Count Summary
    ws_wc = wb.create_sheet(title="Word Count Summary")
    wc_headers = [
        ('CHARACTER NAME', 62.43),
        ('DIALOG WORD COUNT', 28.14),
        ('TRANSCRIPTION WORD COUNT', 34.43),
        ('FOREIGN DIALOGUE WORD COUNT (based on tag)', 45.57),
        ('MUSIC AND SONG WORD COUNT (based on tag)', 45.0),
        ('BURNEDIN SUBTITLE TEXT WORD COUNT (based on tags)', 37.43),
        ('ONSCREEN TEXT WORD COUNT (based on tags)', 30.0),
        ('TOTAL WORD COUNT BY CHARACTER', 34.43)
    ]
    for col_idx, (hdr, width) in enumerate(wc_headers, start=1):
        col_letter = openpyxl.utils.get_column_letter(col_idx)
        ws_wc.column_dimensions[col_letter].width = width
        cell = ws_wc.cell(row=1, column=col_idx, value=hdr)
        cell.font = summary_header_font

    current_wc_row = 2
    cat_totals = [0.0] * 7
    for char, counts in sorted(char_counts.items()):
        ws_wc.cell(row=current_wc_row, column=1, value=char).font = data_font
        vals = [
            counts["dialog"],
            counts["transcription"],
            counts["foreign"],
            counts["music"],
            counts["burnedin"],
            counts["onscreen"],
            counts["total"]
        ]
        for c_idx, val in enumerate(vals, start=2):
            cell = ws_wc.cell(row=current_wc_row, column=c_idx, value=val)
            cell.font = data_font
            cat_totals[c_idx - 2] += val
        current_wc_row += 1

    # Total row
    ws_wc.cell(row=current_wc_row, column=1, value="TOTAL WORD COUNT BY TEXT CATEGORY").font = summary_total_font
    for c_idx, tot in enumerate(cat_totals, start=2):
        cell = ws_wc.cell(row=current_wc_row, column=c_idx, value=tot)
        cell.font = summary_total_font

    # 3. Sheet: Project Info
    ws_proj = wb.create_sheet(title="Project Info")
    ws_proj.column_dimensions['A'].width = 33.14
    ws_proj.column_dimensions['B'].width = 62.43
    
    clean_title = os.path.splitext(os.path.basename(filename or "Project Script"))[0] if filename else "Project Script"
    runtime_mins = "10"
    if last_out_tc and ":" in last_out_tc:
        parts = last_out_tc.split(":")
        try:
            hrs = int(parts[0])
            mins = int(parts[1])
            tot_mins = hrs * 60 + mins
            runtime_mins = str(tot_mins if tot_mins > 0 else 1)
        except Exception:
            runtime_mins = "10"
            
    proj_rows = [
        ("SHOW TITLE", clean_title),
        ("EPISODE TITLE", clean_title),
        ("SEASON #", ""),
        ("EPISODE #", ""),
        ("MOVIE ID", ""),
        ("TOTAL RUNTIME", runtime_mins),
        ("VERSION", "V1.0"),
        ("PROXY ID", ""),
        ("PROXY TYPE", "FINAL_CUT"),
        ("IS QC'd", "No"),
        ("DATE", datetime.now().strftime("%A %d %B %Y %H:%M:%S"))
    ]
    
    for r_idx, (k, v) in enumerate(proj_rows, start=1):
        cell_k = ws_proj.cell(row=r_idx, column=1, value=k)
        cell_k.font = project_label_font
        cell_v = ws_proj.cell(row=r_idx, column=2, value=v)
        cell_v.font = project_val_font

    return wb

def get_user_downloads_dir() -> str:
    if os.name == 'nt':
        import winreg
        try:
            sub_key = r'SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders'
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, sub_key) as key:
                val, _ = winreg.QueryValueEx(key, '{374DE290-123F-4565-9164-39C4925E467B}')
                expanded = os.path.expandvars(val)
                if os.path.exists(expanded):
                    return expanded
        except Exception:
            pass
    dl = os.path.join(os.path.expanduser("~"), "Downloads")
    os.makedirs(dl, exist_ok=True)
    return dl

def get_unique_filepath(folder: str, filename: str) -> str:
    base, ext = os.path.splitext(filename)
    candidate = os.path.join(folder, filename)
    counter = 1
    while os.path.exists(candidate):
        candidate = os.path.join(folder, f"{base} ({counter}){ext}")
        counter += 1
    return candidate

@router.post("/download")
async def download_script(
    cues: str = Form(...),
    export_mode: str = Form(...),
    filename: str = Form(None),
    save_as: bool = Form(False)
):
    try:
        parsed_cues = json.loads(cues)
        clean_name = os.path.splitext(os.path.basename(filename or "Script"))[0] if filename else "Script"
        import re
        import subprocess
        safe_base_name = re.sub(r'[^\w\-_.]', '_', clean_name)
        if not safe_base_name:
            safe_base_name = "Script"

        is_mosaic = (export_mode.strip().lower() == "mosaic")
        ext = "xlsx" if is_mosaic else "docx"
        out_filename = f"{safe_base_name}_{'Mosaic' if is_mosaic else 'ERytmo'}.{ext}"

        if save_as:
            import tkinter as tk
            from tkinter import filedialog
            root = tk.Tk()
            root.withdraw()
            root.attributes('-topmost', True)
            file_types = [("Excel Spreadsheet", "*.xlsx")] if is_mosaic else [("Word Document", "*.docx")]
            file_types.append(("All Files", "*.*"))
            target_path = filedialog.asksaveasfilename(
                title="Save Converted Script",
                initialfile=out_filename,
                defaultextension=f".{ext}",
                filetypes=file_types
            )
            root.destroy()
            if not target_path:
                return {"success": False, "cancelled": True}
        else:
            downloads_dir = get_user_downloads_dir()
            target_path = get_unique_filepath(downloads_dir, out_filename)

        if is_mosaic:
            wb = create_mosaic_excel(parsed_cues, filename=clean_name)
            wb.save(target_path)
        else:
            import docx
            out_doc = docx.Document()
            for idx, cue in enumerate(parsed_cues):
                tc_in = cue.get("in", "")
                if tc_in:
                    out_doc.add_paragraph(tc_in)
                out_doc.add_paragraph(cue.get("character", ""))
                out_doc.add_paragraph(cue.get("dialogue", ""))
                if idx < len(parsed_cues) - 1:
                    out_doc.add_paragraph("")
            out_doc.save(target_path)

        # Reveal in File Explorer automatically
        try:
            if os.name == 'nt' and os.path.exists(target_path):
                subprocess.Popen(f'explorer /select,"{os.path.normpath(target_path)}"')
        except Exception:
            pass

        return {
            "success": True,
            "filename": os.path.basename(target_path),
            "saved_path": os.path.normpath(target_path),
            "export_mode": export_mode
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/open-file")
async def open_file_endpoint(path: str = Form(...)):
    if os.path.exists(path):
        try:
            if os.name == 'nt':
                os.startfile(os.path.normpath(path))
            return {"success": True}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to open file: {e}")
    raise HTTPException(status_code=404, detail="File not found")

@router.post("/open-folder")
async def open_folder_endpoint(path: str = Form(...)):
    folder = path if os.path.isdir(path) else os.path.dirname(path)
    if os.path.exists(folder):
        try:
            if os.name == 'nt':
                import subprocess
                if os.path.isfile(path):
                    subprocess.Popen(f'explorer /select,"{os.path.normpath(path)}"')
                else:
                    subprocess.Popen(f'explorer "{os.path.normpath(folder)}"')
            return {"success": True}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to open folder: {e}")
    raise HTTPException(status_code=404, detail="Folder not found")

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config.json")

def mask_api_key(key: str) -> str:
    if not key:
        return ""
    if len(key) > 8:
        return f"{key[:4]}...{key[-4:]}"
    return key

class ApiKeyCreatePayload(BaseModel):
    provider: str
    key: str
    label: str = None
    is_active: bool = True

class ApiKeyUpdatePayload(BaseModel):
    key: str = None
    label: str = None
    is_active: bool = None

def validate_key_with_provider(provider: str, key_str: str):
    key_str = key_str.strip()
    provider_lower = provider.lower()
    
    if provider_lower == "gemini":
        if not (key_str.startswith("AIza") or key_str.startswith("AQ.")):
            raise HTTPException(status_code=400, detail="Invalid Gemini API Key format. Must start with 'AIza' or 'AQ.'")
        try:
            client = genai.Client(api_key=key_str)
            for _ in client.models.list():
                break
        except Exception as e:
            err = str(e)
            if "400" in err or "403" in err or "API_KEY" in err:
                raise HTTPException(status_code=400, detail="Gemini API Key is invalid or unauthorized.")
            raise HTTPException(status_code=400, detail=f"Failed to verify Gemini API key: {err}")

    elif provider_lower == "openai":
        if not key_str.startswith("sk-"):
            raise HTTPException(status_code=400, detail="Invalid OpenAI API Key format. Must start with 'sk-'")
        try:
            import openai
            client = openai.OpenAI(api_key=key_str)
            client.models.list()
        except Exception as e:
            err = str(e)
            if "401" in err or "invalid" in err.lower():
                raise HTTPException(status_code=400, detail="OpenAI API Key is invalid or unauthorized.")
            raise HTTPException(status_code=400, detail=f"Failed to verify OpenAI API key: {err}")

    elif provider_lower == "groq":
        if not key_str.startswith("gsk_"):
            raise HTTPException(status_code=400, detail="Invalid Groq API Key format. Must start with 'gsk_'")
        try:
            import openai
            client = openai.OpenAI(api_key=key_str, base_url="https://api.groq.com/openai/v1")
            client.models.list()
        except Exception as e:
            err = str(e)
            if "401" in err or "invalid" in err.lower():
                raise HTTPException(status_code=400, detail="Groq API Key is invalid or unauthorized.")
            raise HTTPException(status_code=400, detail=f"Failed to verify Groq API key: {err}")
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

@router.get("/settings/keys")
def get_all_keys(provider: str = None, db: Session = Depends(get_db)):
    query = db.query(models.ApiKey)
    if provider:
        query = query.filter(models.ApiKey.provider == provider.lower())
    keys = query.order_by(models.ApiKey.id.asc()).all()
    
    res = []
    for k in keys:
        res.append({
            "id": k.id,
            "provider": k.provider,
            "label": k.label or f"{k.provider.capitalize()} Key #{k.id}",
            "key": k.key,
            "masked_key": mask_api_key(k.key),
            "is_active": k.is_active,
            "created_at": k.created_at.isoformat() if k.created_at else None
        })
    return res

@router.post("/settings/keys")
def add_api_key(payload: ApiKeyCreatePayload, db: Session = Depends(get_db)):
    provider = payload.provider.strip().lower()
    raw_key = payload.key.strip()
    
    validate_key_with_provider(provider, raw_key)
    
    existing_count = db.query(models.ApiKey).filter(models.ApiKey.provider == provider).count()
    label = payload.label.strip() if (payload.label and payload.label.strip()) else f"{provider.capitalize()} Key {existing_count + 1}"
    
    new_key = models.ApiKey(
        provider=provider,
        key=raw_key,
        label=label,
        is_active=payload.is_active
    )
    db.add(new_key)
    db.commit()
    db.refresh(new_key)
    
    return {
        "id": new_key.id,
        "provider": new_key.provider,
        "label": new_key.label,
        "masked_key": mask_api_key(new_key.key),
        "is_active": new_key.is_active,
        "created_at": new_key.created_at.isoformat() if new_key.created_at else None
    }

@router.put("/settings/keys/{key_id}")
def update_api_key_by_id(key_id: int, payload: ApiKeyUpdatePayload, db: Session = Depends(get_db)):
    db_key = db.query(models.ApiKey).filter(models.ApiKey.id == key_id).first()
    if not db_key:
        raise HTTPException(status_code=404, detail="API Key not found")
        
    if payload.key is not None and payload.key.strip():
        new_key_str = payload.key.strip()
        validate_key_with_provider(db_key.provider, new_key_str)
        db_key.key = new_key_str
        
    if payload.label is not None:
        db_key.label = payload.label.strip()
        
    if payload.is_active is not None:
        db_key.is_active = payload.is_active
        
    db.commit()
    db.refresh(db_key)
    return {
        "id": db_key.id,
        "provider": db_key.provider,
        "label": db_key.label,
        "masked_key": mask_api_key(db_key.key),
        "is_active": db_key.is_active,
        "created_at": db_key.created_at.isoformat() if db_key.created_at else None
    }

@router.patch("/settings/keys/{key_id}/toggle")
def toggle_api_key_status(key_id: int, db: Session = Depends(get_db)):
    db_key = db.query(models.ApiKey).filter(models.ApiKey.id == key_id).first()
    if not db_key:
        raise HTTPException(status_code=404, detail="API Key not found")
        
    db_key.is_active = not db_key.is_active
    db.commit()
    db.refresh(db_key)
    return {
        "id": db_key.id,
        "provider": db_key.provider,
        "label": db_key.label,
        "is_active": db_key.is_active
    }

@router.delete("/settings/keys/{key_id}")
def delete_api_key_by_id(key_id: int, db: Session = Depends(get_db)):
    db_key = db.query(models.ApiKey).filter(models.ApiKey.id == key_id).first()
    if not db_key:
        raise HTTPException(status_code=404, detail="API Key not found")
        
    db.delete(db_key)
    db.commit()
    return {"message": "API key deleted successfully"}

# Legacy endpoints compatibility
@router.get("/settings/api-key")
def get_api_key(db: Session = Depends(get_db)):
    first_key = db.query(models.ApiKey).filter(models.ApiKey.provider == "gemini", models.ApiKey.is_active == True).first()
    if first_key:
        return {"has_key": True, "masked_key": mask_api_key(first_key.key)}
    return {"has_key": False, "masked_key": ""}

class ApiKeyUpdate(BaseModel):
    api_key: str

@router.post("/settings/api-key")
def set_api_key(data: ApiKeyUpdate, db: Session = Depends(get_db)):
    api_key = data.api_key.strip()
    validate_key_with_provider("gemini", api_key)
    first_key = db.query(models.ApiKey).filter(models.ApiKey.provider == "gemini").first()
    if first_key:
        first_key.key = api_key
        first_key.is_active = True
    else:
        first_key = models.ApiKey(provider="gemini", key=api_key, label="Gemini Key 1", is_active=True)
        db.add(first_key)
    db.commit()
    return {"success": True}

@router.delete("/settings/api-key")
def delete_api_key(db: Session = Depends(get_db)):
    db.query(models.ApiKey).filter(models.ApiKey.provider == "gemini").delete()
    db.commit()
    return {"success": True}

@router.get("/settings/openai-key")
def get_openai_key(db: Session = Depends(get_db)):
    first_key = db.query(models.ApiKey).filter(models.ApiKey.provider == "openai", models.ApiKey.is_active == True).first()
    if first_key:
        return {"has_key": True, "masked_key": mask_api_key(first_key.key)}
    return {"has_key": False, "masked_key": ""}

@router.post("/settings/openai-key")
def set_openai_key(data: ApiKeyUpdate, db: Session = Depends(get_db)):
    api_key = data.api_key.strip()
    validate_key_with_provider("openai", api_key)
    first_key = db.query(models.ApiKey).filter(models.ApiKey.provider == "openai").first()
    if first_key:
        first_key.key = api_key
        first_key.is_active = True
    else:
        first_key = models.ApiKey(provider="openai", key=api_key, label="OpenAI Key 1", is_active=True)
        db.add(first_key)
    db.commit()
    return {"success": True}

@router.delete("/settings/openai-key")
def delete_openai_key(db: Session = Depends(get_db)):
    db.query(models.ApiKey).filter(models.ApiKey.provider == "openai").delete()
    db.commit()
    return {"success": True}

@router.get("/settings/groq-key")
def get_groq_key(db: Session = Depends(get_db)):
    first_key = db.query(models.ApiKey).filter(models.ApiKey.provider == "groq", models.ApiKey.is_active == True).first()
    if first_key:
        return {"has_key": True, "masked_key": mask_api_key(first_key.key)}
    return {"has_key": False, "masked_key": ""}

@router.post("/settings/groq-key")
def set_groq_key(data: ApiKeyUpdate, db: Session = Depends(get_db)):
    api_key = data.api_key.strip()
    validate_key_with_provider("groq", api_key)
    first_key = db.query(models.ApiKey).filter(models.ApiKey.provider == "groq").first()
    if first_key:
        first_key.key = api_key
        first_key.is_active = True
    else:
        first_key = models.ApiKey(provider="groq", key=api_key, label="Groq Key 1", is_active=True)
        db.add(first_key)
    db.commit()
    return {"success": True}

@router.delete("/settings/groq-key")
def delete_groq_key(db: Session = Depends(get_db)):
    db.query(models.ApiKey).filter(models.ApiKey.provider == "groq").delete()
    db.commit()
    return {"success": True}

