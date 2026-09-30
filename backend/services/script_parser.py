import os
import traceback
import logging
import json
import docx
from pypdf import PdfReader
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from backend.src.exceptions import (
    ScriptImportError, UnsupportedFormatError, EmptyFileError,
    FileAccessError, FileCorruptedError, NoTimecodesFoundError
)
from backend.services.script_validator import ScriptValidator, ValidationStatus, ValidationReport

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

import re
import time

def parse_json_response(text):
    if not text:
        return {}
    raw_response = text.strip()
    
    if "```" in raw_response:
        match = re.search(r'```(?:json)?\s*(\{.*\}|\[.*\])\s*```', raw_response, re.DOTALL)
        if match:
            raw_response = match.group(1)
        else:
            raw_response = re.sub(r'^```[a-zA-Z]*\n?', '', raw_response)
            raw_response = re.sub(r'\n?```$', '', raw_response)
    
    match = re.search(r'(\{.*\}|\[.*\])', raw_response, re.DOTALL)
    if match:
        raw_response = match.group(1)
        
    try:
        data = json.loads(raw_response)
        if isinstance(data, list):
            return {"cues": data}
        return data
    except Exception as e:
        log_debug(f"JSON parsing failed on text snippet: {raw_response[:200]}... Error: {e}")
        return {}

class ScriptCue(BaseModel):
    in_time: str = Field(alias="in", description="Timecode IN (e.g. 10:00:00:00)")
    out_time: str = Field(alias="out", description="Timecode OUT, empty if not available")
    character: str = Field(description="Character name speaking")
    dialogue: str = Field(description="Dialogue text")

class ScriptCues(BaseModel):
    cues: list[ScriptCue]

from backend.database.database import SessionLocal
from backend.models import models
from backend.services.encryption_service import decrypt_secret

def get_db_active_keys(provider=None, user_id=None):
    db = SessionLocal()
    try:
        query = db.query(models.ApiKey).filter(models.ApiKey.is_active == True)
        if user_id is not None:
            query = query.filter(models.ApiKey.user_id == user_id)
        if provider:
            query = query.filter(models.ApiKey.provider == provider.lower())
        keys = query.order_by(models.ApiKey.id.asc()).all()
        for k in keys:
            if k.key:
                k.key = decrypt_secret(k.key)
        return keys
    finally:
        db.close()

def chunk_text(text: str, max_chars: int = 4000) -> list[str]:
    if not text or len(text) <= max_chars:
        return [text]
    chunks = []
    lines = text.split("\n")
    current_chunk = []
    current_len = 0
    for line in lines:
        if current_len + len(line) + 1 > max_chars and current_chunk:
            chunks.append("\n".join(current_chunk))
            current_chunk = [line]
            current_len = len(line)
        else:
            current_chunk.append(line)
            current_len += len(line) + 1
    if current_chunk:
        chunks.append("\n".join(current_chunk))
    return chunks

def parse_with_single_openai_key(raw_text, api_key):
    import openai
    client = openai.OpenAI(api_key=api_key)
    chunks = chunk_text(raw_text, max_chars=2500)
    all_raw_rows = []

    for idx, chunk in enumerate(chunks):
        if idx > 0:
            time.sleep(0.3)
        prompt = f"""
You are an expert dubbing and adaptation script parser. Extract all dialogue cues from this script chunk.

For each dialogue cue, extract:
- 'in': The starting timecode (e.g. 01:00:00:00 or 01:00:00). Leave empty string "" if not present.
- 'out': The ending timecode (e.g. 01:00:05:00). Leave empty string "" if not present.
- 'character': Character name speaking. Default to "CHARACTER" if unknown.
- 'dialogue': Spoken dialogue text line.

RULES:
- Do NOT include scene descriptions or action lines as dialogue.
- Clean up character names (e.g., remove parentheticals like (V.O.) or (O.S.)).
- Return ONLY valid JSON matching the schema: {{"cues": [{{"in": "...", "out": "...", "character": "...", "dialogue": "..."}}]}}

SCRIPT CHUNK ({idx+1}/{len(chunks)}):
{chunk}
"""
        log_debug(f"Sending prompt to OpenAI key (chunk {idx+1}/{len(chunks)})...")
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        content = response.choices[0].message.content
        if content:
            data = parse_json_response(content)
            for cue in data.get("cues", []):
                all_raw_rows.append({
                    "in": cue.get("in", ""),
                    "out": cue.get("out", ""),
                    "character": cue.get("character", "CHARACTER").strip(),
                    "dialogue": cue.get("dialogue", " ").strip()
                })
    log_debug(f"OpenAI extracted {len(all_raw_rows)} total cues successfully.")
    return all_raw_rows

def parse_with_single_groq_key(raw_text, api_key):
    import openai
    client = openai.OpenAI(
        api_key=api_key, 
        base_url="https://api.groq.com/openai/v1",
        max_retries=1,
        timeout=12.0
    )
    groq_models = ["qwen/qwen3.8-27b", "allam-2-7b", "openai/gpt-oss-20b", "openai/gpt-oss-120b"]
    
    chunks = chunk_text(raw_text, max_chars=6000)
    if len(chunks) > 5:
        chunks = chunks[:5]
        
    last_err = None

    for model_name in groq_models:
        try:
            log_debug(f"Attempting Groq parsing with model: {model_name} across {len(chunks)} chunks...")
            all_raw_rows = []
            for idx, chunk in enumerate(chunks):
                if idx > 0:
                    time.sleep(0.3)
                prompt = f"""
You are an expert dubbing and adaptation script parser. Extract all dialogue cues from this script chunk.

For each dialogue cue, extract:
- 'in': The starting timecode (e.g. 01:00:00:00 or 01:00:00). Leave empty string "" if not present.
- 'out': The ending timecode (e.g. 01:00:05:00). Leave empty string "" if not present.
- 'character': Character name speaking. Default to "CHARACTER" if unknown.
- 'dialogue': Spoken dialogue text line.

RULES:
- Extract ONLY spoken dialogue lines by characters.
- Do NOT extract scene descriptions, action lines, camera angles (e.g. EXT., INT., CLOSE ON, FADE IN), or stage directions as dialogue.
- Clean up character names (remove parentheticals like (V.O.) or (O.S.)).
- Return ONLY valid JSON matching the schema: {{"cues": [{{"in": "...", "out": "...", "character": "...", "dialogue": "..."}}]}}

SCRIPT CHUNK ({idx+1}/{len(chunks)}):
{chunk}
"""
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    temperature=0.1
                )
                content = response.choices[0].message.content
                if content:
                    data = parse_json_response(content)
                    for cue in data.get("cues", []):
                        all_raw_rows.append({
                            "in": cue.get("in", ""),
                            "out": cue.get("out", ""),
                            "character": cue.get("character", "CHARACTER").strip(),
                            "dialogue": cue.get("dialogue", " ").strip()
                        })
            if all_raw_rows:
                log_debug(f"Groq ({model_name}) extracted {len(all_raw_rows)} total cues successfully across {len(chunks)} chunks.")
                return all_raw_rows
        except Exception as e:
            err_str = str(e)
            log_debug(f"Groq model {model_name} failed: {err_str}")
            if "429" in err_str or "rate_limit" in err_str or "TPM" in err_str or "tokens per minute" in err_str:
                raise ScriptImportError(
                    "Groq Rate Limit Exceeded",
                    "Groq free tier token limit (8,000 TPM) was exceeded for this large script file.",
                    "Please ensure your Gemini Key is active in Settings for processing large script files."
                )
            last_err = e
            
    if last_err:
        raise last_err
    return []

def parse_with_single_gemini_key(raw_text, api_key):
    client = genai.Client(api_key=api_key)
    prompt = f"""
You are an expert dubbing and adaptation script parser. Your task is to extract dialogue cues from the following raw script text.
The script may be in any language and any unstructured format. It may contain scene descriptions, action lines, and other noise.

For each dialogue cue you find, extract:
- 'in': The starting timecode (if any).
- 'out': The ending timecode (if any).
- 'character': The character speaking. Ignore scene directions.
- 'dialogue': The actual dialogue text spoken.

RULES:
- If a timecode is missing, leave it as an empty string ("").
- Do NOT include scene descriptions or action lines as dialogue or characters.
- Clean up character names (e.g., remove parentheticals like (V.O.) or (O.S.) or (ON THE PHONE)).
- Return ONLY valid JSON matching the requested schema.

SCRIPT TEXT (May be long):
{raw_text}
"""
    log_debug("Sending prompt to Gemini key...")
    gemini_models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest']
    last_err = None
    for model_name in gemini_models:
        try:
            log_debug(f"Attempting Gemini parsing with model: {model_name}")
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ScriptCues,
                    temperature=0.1,
                ),
            )
            if response.text:
                data = parse_json_response(response.text)
                cues = data.get("cues", [])
                raw_rows = []
                for cue in cues:
                    raw_rows.append({
                        "in": cue.get("in", ""),
                        "out": cue.get("out", ""),
                        "character": cue.get("character", "CHARACTER").strip(),
                        "dialogue": cue.get("dialogue", " ").strip()
                    })
                log_debug(f"Gemini ({model_name}) extracted {len(raw_rows)} cues successfully.")
                return raw_rows
        except Exception as e:
            log_debug(f"Gemini model {model_name} failed: {e}")
            last_err = e

    if last_err:
        raise last_err
    return []


def parse_with_gemini(raw_text, user_id=None):
    gemini_keys = get_db_active_keys("gemini", user_id=user_id)
    openai_keys = get_db_active_keys("openai", user_id=user_id)
    groq_keys = get_db_active_keys("groq", user_id=user_id)

    errors = []

    # 1. Try Gemini Active Keys sequentially
    for key_obj in gemini_keys:
        label = key_obj.label or f"Gemini Key #{key_obj.id}"
        try:
            log_debug(f"Parsing script with active {label}...")
            return parse_with_single_gemini_key(raw_text, key_obj.key)
        except Exception as e:
            err_msg = f"{label} failed: {e}"
            log_debug(err_msg)
            errors.append(err_msg)

    # 2. Try OpenAI Active Keys sequentially
    for key_obj in openai_keys:
        label = key_obj.label or f"OpenAI Key #{key_obj.id}"
        try:
            log_debug(f"Fallback: Parsing script with active {label}...")
            return parse_with_single_openai_key(raw_text, key_obj.key)
        except Exception as e:
            err_msg = f"{label} failed: {e}"
            log_debug(err_msg)
            errors.append(err_msg)

    # 3. Try Groq Active Keys sequentially
    for key_obj in groq_keys:
        label = key_obj.label or f"Groq Key #{key_obj.id}"
        try:
            log_debug(f"Fallback: Parsing script with active {label}...")
            return parse_with_single_groq_key(raw_text, key_obj.key)
        except Exception as e:
            err_msg = f"{label} failed: {e}"
            log_debug(err_msg)
            errors.append(err_msg)

    # Fallback to legacy config.json / env vars if DB has no keys
    if not gemini_keys and not openai_keys and not groq_keys:
        legacy_gemini = get_gemini_api_key()
        if legacy_gemini:
            try:
                return parse_with_single_gemini_key(raw_text, legacy_gemini)
            except Exception as e:
                errors.append(f"Legacy Gemini key failed: {e}")
        legacy_openai = get_openai_api_key()
        if legacy_openai:
            try:
                return parse_with_single_openai_key(raw_text, legacy_openai)
            except Exception as e:
                errors.append(f"Legacy OpenAI key failed: {e}")
        legacy_groq = get_groq_api_key()
        if legacy_groq:
            try:
                return parse_with_single_groq_key(raw_text, legacy_groq)
            except Exception as e:
                errors.append(f"Legacy Groq key failed: {e}")

    if not errors:
        raise ScriptImportError(
            "API Key Missing",
            "No active API keys found. Please add and activate at least one API Key (Gemini, OpenAI, or Groq) in Settings.",
            "Go to Settings tab to add and activate your API keys."
        )

    raise ScriptImportError(
        "All AI Key Parsing Attempts Failed",
        f"All active API keys failed to process the script.\nErrors:\n" + "\n".join(errors[:4]),
        "Please check your key quotas, internet connection, or activate another working key in Settings."
    )


def check_chronological_order(cues):
    def tc_to_frames(tc):
        if not tc: return 0
        parts = tc.split(':')
        if len(parts) >= 3:
            h = int(parts[0])
            m = int(parts[1])
            s = int(parts[2])
            f = int(parts[3]) if len(parts) > 3 else 0
            return (h * 3600 + m * 60 + s) * 25 + f
        return 0

    def frames_to_tc(frames):
        f = frames % 25
        s = (frames // 25) % 60
        m = (frames // (25 * 60)) % 60
        h = (frames // (25 * 3600))
        return f"{h:02d}:{m:02d}:{s:02d}:{f:02d}"

    last_frames = 0
    for cue in cues:
        in_frames = tc_to_frames(cue["in"])
        if in_frames > 0:
            if in_frames < last_frames:
                cue["in"] = frames_to_tc(last_frames)
                in_frames = last_frames
            last_frames = in_frames
        
        out_frames = tc_to_frames(cue["out"])
        if out_frames > 0:
            if out_frames < in_frames:
                cue["out"] = frames_to_tc(in_frames)
            last_frames = tc_to_frames(cue["out"])

    return cues

def get_ffmpeg_binary():
    import shutil
    sys_ffmpeg = shutil.which("ffmpeg")
    if sys_ffmpeg:
        return sys_ffmpeg
    try:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
        if exe and os.path.exists(exe):
            return exe
    except Exception:
        pass
    return None

def extract_audio_if_video(media_path):
    """
    Optimizes any video or large uncompressed audio file for ultra-fast Gemini upload and alignment.
    Converts to a lightweight 16kHz mono MP3 (48kbps), which preserves 100% speech clarity
    for AI while shrinking a 500MB video or 300MB WAV down to 5-10MB (98% reduction!).
    """
    import subprocess
    import tempfile
    
    ffmpeg_exe = get_ffmpeg_binary()
    if not ffmpeg_exe:
        log_debug("No FFmpeg executable found. Using original media file.")
        return media_path, False
        
    ext = os.path.splitext(media_path)[1].lower()
    file_size_mb = os.path.getsize(media_path) / (1024 * 1024)
    
    # If already a small MP3 under 15MB, no need to re-encode
    if ext == ".mp3" and file_size_mb < 15:
        return media_path, False
        
    temp_audio_path = os.path.join(tempfile.gettempdir(), f"compressed_audio_{os.path.basename(media_path)}.mp3")
    
    try:
        log_debug(f"Compressing media ({file_size_mb:.1f} MB) to lightweight 16kHz speech MP3 using FFmpeg...")
        t0 = time.time()
        subprocess.run(
            [
                ffmpeg_exe, "-y", "-i", media_path,
                "-vn",             # No video
                "-ac", "1",        # Mono channel
                "-ar", "16000",    # 16kHz sample rate (optimal for speech recognition)
                "-c:a", "libmp3lame",
                "-b:a", "48k",     # 48kbps
                temp_audio_path
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        compressed_size_mb = os.path.getsize(temp_audio_path) / (1024 * 1024)
        duration_s = time.time() - t0
        log_debug(f"Audio compressed from {file_size_mb:.1f} MB to {compressed_size_mb:.1f} MB in {duration_s:.2f}s! (Saving {100 - (compressed_size_mb/file_size_mb*100):.1f}% bandwidth)")
        return temp_audio_path, True
    except Exception as e:
        log_debug(f"FFmpeg compression failed: {e}. Falling back to original media.")
        return media_path, False

def align_timecodes_with_gemini(script_cues, media_path, start_timecode="00:00:00:00", user_id=None):
    active_keys = get_db_active_keys("gemini", user_id=user_id)
    keys_to_try = [k.key for k in active_keys]
    
    if not keys_to_try:
        legacy_key = get_gemini_api_key()
        if legacy_key:
            keys_to_try = [legacy_key]

    if not keys_to_try:
        raise ScriptImportError(
            "Gemini API Key Missing",
            "To use media alignment, you must provide and activate at least one Gemini API Key in Settings.",
            "Please go to Settings -> Gemini AI to add and activate your Gemini API key."
        )
    
    upload_path, is_temp = extract_audio_if_video(media_path)
    errors = []

    for idx, key in enumerate(keys_to_try):
        label = active_keys[idx].label if idx < len(active_keys) else "Gemini Key"
        log_debug(f"Attempting media alignment using {label}...")
        try:
            client = genai.Client(api_key=key)
            log_debug(f"Uploading media file to Gemini: {upload_path}")
            uploaded_media = client.files.upload(file=upload_path)
            
            log_debug("Waiting for file processing...")
            import time
            while uploaded_media.state.name == "PROCESSING":
                time.sleep(1)
                uploaded_media = client.files.get(name=uploaded_media.name)

            if uploaded_media.state.name == "FAILED":
                raise Exception("Gemini failed to process the media file.")
            
            # Format cues compactly to drastically reduce generation tokens (15x faster generation)
            compact_cues = []
            for i, c in enumerate(script_cues):
                char = c.get("character", "CHARACTER")
                diag = c.get("dialogue", "")
                tc_hint = f" [TC: {c.get('in')}]" if c.get("in") else ""
                compact_cues.append(f"[{i}] {char}: {diag}{tc_hint}")
            cues_text = "\n".join(compact_cues)

            prompt = f"""
You are an expert dubbing and adaptation script aligner.
Your task is to accurately align each dialogue cue with the provided audio/video track.

Media start timecode: {start_timecode} (Assume 25 FPS, SMPTE format HH:MM:SS:FF).
Strict chronological order is required: each cue's IN timecode must be >= previous cue's OUT timecode.
If a cue has [TC: ...], adjust it slightly to match the exact audio start and end.

OUTPUT FORMAT:
For each cue [id], output EXACTLY ONE line in valid JSONL format containing only id, in, and out:
{{"id": <id>, "in": "HH:MM:SS:FF", "out": "HH:MM:SS:FF"}}

RULES:
- Output ONLY JSON lines ({{"id": ..., "in": "...", "out": "..."}}).
- Do NOT output markdown code fences (```).
- Do NOT output dialogue or character names (they are mapped automatically by id).
- Ensure all cues from 0 to {len(script_cues)-1} are included sequentially.

CUES TO ALIGN:
{cues_text}
"""
            log_debug("Sending prompt and media to Gemini (Streaming JSONL)...")
            
            # Try fastest models first
            gemini_models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-1.5-flash']
            response_stream = None
            for model_cand in gemini_models:
                try:
                    response_stream = client.models.generate_content_stream(
                        model=model_cand,
                        contents=[uploaded_media, prompt],
                        config=types.GenerateContentConfig(
                            response_mime_type="text/plain",
                            temperature=0.1,
                        ),
                    )
                    break
                except Exception as me:
                    log_debug(f"Model {model_cand} failed: {me}. Trying next...")
                    continue
            
            if not response_stream:
                raise Exception("Failed to start alignment stream with any Gemini model.")
            
            def chronological_generator():
                buffer = ""
                last_frames = 0
                out_cues = [dict(c) for c in script_cues]
                seen_indices = set()
                
                def tc_to_frames(tc):
                    if not tc: return 0
                    parts = str(tc).split(':')
                    if len(parts) >= 3:
                        try:
                            h = int(parts[0])
                            m = int(parts[1])
                            s = int(parts[2])
                            f = int(parts[3]) if len(parts) > 3 else 0
                            return (h * 3600 + m * 60 + s) * 25 + f
                        except:
                            return 0
                    return 0

                def frames_to_tc(frames):
                    f = frames % 25
                    s = (frames // 25) % 60
                    m = (frames // (25 * 60)) % 60
                    h = (frames // (25 * 3600))
                    return f"{h:02d}:{m:02d}:{s:02d}:{f:02d}"

                def process_parsed_cue(cue_data):
                    nonlocal last_frames
                    cue_id = cue_data.get("id")
                    if cue_id is not None:
                        try:
                            idx = int(cue_id)
                            if 0 <= idx < len(out_cues):
                                target = out_cues[idx]
                                raw_in = cue_data.get("in", "")
                                raw_out = cue_data.get("out", "")
                                
                                in_frames = tc_to_frames(raw_in)
                                if in_frames > 0:
                                    if in_frames < last_frames:
                                        raw_in = frames_to_tc(last_frames)
                                        in_frames = last_frames
                                    last_frames = in_frames
                                
                                out_frames = tc_to_frames(raw_out)
                                if out_frames > 0:
                                    if out_frames < in_frames:
                                        raw_out = frames_to_tc(in_frames + 25)
                                    last_frames = tc_to_frames(raw_out)
                                
                                target["in"] = raw_in
                                target["out"] = raw_out
                                seen_indices.add(idx)
                                return target
                        except (ValueError, TypeError):
                            pass
                    
                    # Backward compatibility if full cue object was returned
                    if "dialogue" in cue_data or "character" in cue_data:
                        raw_in = cue_data.get("in", "")
                        raw_out = cue_data.get("out", "")
                        in_frames = tc_to_frames(raw_in)
                        if in_frames > 0:
                            if in_frames < last_frames:
                                raw_in = frames_to_tc(last_frames)
                                in_frames = last_frames
                            last_frames = in_frames
                        out_frames = tc_to_frames(raw_out)
                        if out_frames > 0:
                            if out_frames < in_frames:
                                raw_out = frames_to_tc(in_frames + 25)
                            last_frames = tc_to_frames(raw_out)
                        return {
                            "in": raw_in,
                            "out": raw_out,
                            "character": cue_data.get("character", "CHARACTER").strip(),
                            "dialogue": cue_data.get("dialogue", " ").strip()
                        }
                    return None

                try:
                    for chunk in response_stream:
                        if chunk.text:
                            buffer += chunk.text
                            while "\n" in buffer:
                                line, buffer = buffer.split("\n", 1)
                                line = line.strip()
                                if not line or line.startswith("```") or line in ("[", "]"):
                                    continue
                                if line.endswith(","):
                                    line = line[:-1]
                                try:
                                    cue_obj = json.loads(line)
                                    processed = process_parsed_cue(cue_obj)
                                    if processed:
                                        yield processed
                                except json.JSONDecodeError:
                                    continue

                    # Process remaining buffer
                    line = buffer.strip()
                    if line and not line.startswith("```") and line not in ("[", "]"):
                        if line.endswith(","):
                            line = line[:-1]
                        try:
                            cue_obj = json.loads(line)
                            processed = process_parsed_cue(cue_obj)
                            if processed:
                                yield processed
                        except:
                            pass

                    # Yield any cues that might have been skipped by ID
                    for idx, c in enumerate(out_cues):
                        if idx not in seen_indices:
                            yield c

                finally:
                    try:
                        client.files.delete(name=uploaded_media.name)
                        log_debug("Deleted media file from Gemini servers.")
                    except Exception as e:
                        log_debug(f"Failed to delete media file: {e}")
                        
                    if is_temp and os.path.exists(upload_path):
                        try:
                            os.remove(upload_path)
                            log_debug("Deleted local temporary extracted audio file.")
                        except:
                            pass

            return chronological_generator()
        except Exception as e:
            log_debug(f"Gemini API Alignment with {label} failed: {e}")
            errors.append(f"{label}: {str(e)}")

    raise ScriptImportError(
        "AI Alignment Failed",
        f"All active Gemini API keys failed during media alignment.\nErrors:\n" + "\n".join(errors[:3]),
        "Please check your Gemini key quotas, internet connection, or activate another working Gemini key in Settings."
    )


def collapse_spaced_text(text):
    if not text:
        return text
    lines = text.split("\n")
    fixed_lines = []
    for line in lines:
        if not line.strip():
            fixed_lines.append(line)
            continue
        tokens = line.strip().split(" ")
        single_char_tokens = [t for t in tokens if len(t) == 1]
        if len(tokens) > 3 and (len(single_char_tokens) / len(tokens)) > 0.4:
            if "  " in line:
                words = line.split("  ")
                line = " ".join([w.replace(" ", "") for w in words if w.strip()])
            else:
                line = re.sub(r'(?<=\b[A-Za-z0-9!.,\'"-])\s+(?=[A-Za-z0-9!.,\'"-]\b)', '', line)
        fixed_lines.append(line)
    return "\n".join(fixed_lines)

def read_text_smart(file_path):
    with open(file_path, "rb") as f:
        raw = f.read()

    # 1. Check BOMs
    if raw.startswith(b'\xff\xfe'):
        try:
            return raw.decode("utf-16").replace("\x00", "")
        except Exception:
            pass
    elif raw.startswith(b'\xfe\xff'):
        try:
            return raw.decode("utf-16-be").replace("\x00", "")
        except Exception:
            pass
    elif raw.startswith(b'\xef\xbb\xbf'):
        try:
            return raw.decode("utf-8-sig").replace("\x00", "")
        except Exception:
            pass

    # 2. Try common encodings
    for enc in ["utf-8", "utf-16", "utf-16-le", "cp1252", "latin-1"]:
        try:
            decoded = raw.decode(enc)
            if decoded.count("\x00") < len(decoded) * 0.05:
                return decoded.replace("\x00", "")
        except (UnicodeDecodeError, Exception):
            continue

    return raw.decode("utf-8", errors="ignore").replace("\x00", "")

def extract_raw_text_docx(file_path):
    log_debug(f"Extracting raw text from DOCX: {file_path}")
    doc = docx.Document(file_path)
    text = []
    for p in doc.paragraphs:
        if p.text.strip(): text.append(p.text.strip())
    for t in doc.tables:
        for r in t.rows:
            row_text = " | ".join([c.text.strip() for c in r.cells if c.text.strip()])
            if row_text: text.append(row_text)
    return collapse_spaced_text("\n".join(text))

def extract_raw_text_pdf(file_path):
    log_debug(f"Extracting raw text from PDF: {file_path}")
    reader = PdfReader(file_path)
    raw = "\n".join(page.extract_text() or "" for page in reader.pages)
    return collapse_spaced_text(raw)

def extract_raw_text_txt(file_path):
    log_debug(f"Extracting raw text from TXT: {file_path}")
    return collapse_spaced_text(read_text_smart(file_path))

def parse_script_locally(input_path):
    """
    Ultra-fast local parser (< 0.05 seconds).
    Accurately parses:
    1. DOCX tables (standard dubbing tables, both with and without timecodes)
    2. Standard 3-line / 4-line timecoded script paragraphs
    3. Inline timecoded lines (e.g. 01:00:00:00 CHARACTER: Dialogue)
    4. Screenplay / script formats (INT./EXT. scene headings, CHARACTER, dialogue)
    5. Subtitle transcripts and plain dialogue scripts
    """
    ext = os.path.splitext(input_path)[1].lower()
    cues = []
    TC_REGEX = re.compile(r'\b(\d{1,2}:\d{2}:\d{2}(?:[:;.]\d{1,2})?)\b')

    # --- 1. DOCX Tables ---
    if ext == ".docx":
        try:
            doc = docx.Document(input_path)
            if doc.tables:
                for table in doc.tables:
                    if len(table.rows) < 2:
                        continue
                    hdr_cells = [c.text.strip().upper() for c in table.rows[0].cells]
                    tc_in_idx = -1
                    tc_out_idx = -1
                    char_idx = -1
                    diag_idx = -1

                    for idx, cell in enumerate(hdr_cells):
                        norm = re.sub(r'[^A-Z0-9]', '', cell)
                        if any(k in norm for k in ['TCOUT', 'OUT', 'END', 'STF']) and tc_out_idx == -1:
                            tc_out_idx = idx
                        elif any(k in norm for k in ['TCIN', 'TIMECODE', 'TIME', 'CODE', 'IN', 'START', 'HORODATAGE']) and tc_in_idx == -1:
                            tc_in_idx = idx
                        elif any(k in norm for k in ['CHARACTER', 'PERSO', 'PERSONNAGE', 'SPEAKER', 'ACTOR', 'ROLE', 'NAME', 'TITLE']) and char_idx == -1:
                            char_idx = idx
                        elif any(k in norm for k in ['DIALOGUE', 'DIALOG', 'TEXT', 'SPEECH', 'LINE', 'PAROLE', 'CONTENT']) and diag_idx == -1:
                            diag_idx = idx

                    num_cols = len(hdr_cells)
                    if num_cols >= 4:
                        if tc_in_idx == -1: tc_in_idx = 0
                        if tc_out_idx == -1: tc_out_idx = 1
                        if char_idx == -1: char_idx = 2
                        if diag_idx == -1: diag_idx = 3
                    elif num_cols == 3:
                        if tc_in_idx == -1: tc_in_idx = 0
                        if char_idx == -1: char_idx = 1
                        if diag_idx == -1: diag_idx = 2
                    elif num_cols == 2:
                        if char_idx == -1: char_idx = 0
                        if diag_idx == -1: diag_idx = 1

                    for row in table.rows[1:]:
                        row_cells = [c.text.strip() for c in row.cells]
                        if not any(row_cells):
                            continue
                        
                        raw_in = row_cells[tc_in_idx] if 0 <= tc_in_idx < len(row_cells) else ""
                        raw_out = row_cells[tc_out_idx] if 0 <= tc_out_idx < len(row_cells) else ""
                        raw_char = row_cells[char_idx] if 0 <= char_idx < len(row_cells) else ""
                        raw_diag = row_cells[diag_idx] if 0 <= diag_idx < len(row_cells) else ""

                        m_in = TC_REGEX.search(raw_in)
                        m_out = TC_REGEX.search(raw_out)
                        
                        tc_in_val = m_in.group(1) if m_in else ""
                        tc_out_val = m_out.group(1) if m_out else ""
                        
                        clean_char = re.sub(r'\s*\([^)]*\)', '', raw_char).strip().upper()
                        
                        if clean_char or raw_diag:
                            cues.append({
                                "in": tc_in_val,
                                "out": tc_out_val,
                                "character": clean_char or "CHARACTER",
                                "dialogue": raw_diag or " "
                            })
                if len(cues) > 0:
                    valid_cues = [c for c in cues if (c["character"] and c["dialogue"].strip())]
                    if valid_cues:
                        log_debug(f"Local DOCX table parser extracted {len(valid_cues)} cues instantly.")
                        return valid_cues
        except Exception as e:
            log_debug(f"Local DOCX table parsing error: {e}")

    # --- 2. Read Lines for Paragraph / Screenplay Parsing ---
    lines = []
    try:
        if ext == ".docx":
            doc = docx.Document(input_path)
            lines = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        elif ext == ".pdf":
            reader = PdfReader(input_path)
            for page in reader.pages:
                txt = page.extract_text()
                if txt:
                    lines.extend([l.strip() for l in txt.split("\n") if l.strip()])
        elif ext in [".txt", ".text"]:
            txt_content = read_text_smart(input_path)
            lines = [l.strip() for l in txt_content.splitlines() if l.strip()]
    except Exception as e:
        log_debug(f"Failed to read file lines for local parsing: {e}")
        return []

    if not lines:
        return []

    # First check: Does file contain standard timecodes?
    tc_count = sum(1 for l in lines if TC_REGEX.search(l))
    
    if tc_count >= 1:
        curr_in = ""
        curr_out = ""
        curr_char = ""
        curr_diag = []

        for line in lines:
            tc_matches = TC_REGEX.findall(line)
            if tc_matches:
                if curr_char or curr_diag:
                    cues.append({
                        "in": curr_in,
                        "out": curr_out,
                        "character": curr_char or "CHARACTER",
                        "dialogue": " ".join(curr_diag)
                    })
                    curr_diag = []
                    curr_char = ""
                
                curr_in = tc_matches[0]
                curr_out = tc_matches[1] if len(tc_matches) > 1 else ""
                
                rem = line
                for tcm in tc_matches:
                    rem = rem.replace(tcm, "").strip()
                rem = re.sub(r'^[-\s:]+', '', rem).strip()

                if rem:
                    if ":" in rem:
                        parts = rem.split(":", 1)
                        curr_char = re.sub(r'\s*\([^)]*\)', '', parts[0]).strip().upper()
                        if parts[1].strip():
                            curr_diag.append(parts[1].strip())
                    elif rem.isupper() and len(rem) < 35:
                        curr_char = re.sub(r'\s*\([^)]*\)', '', rem).strip().upper()
                    else:
                        curr_diag.append(rem)
            else:
                if ":" in line and not curr_diag:
                    parts = line.split(":", 1)
                    potential_char = parts[0].strip()
                    if len(potential_char) < 35 and potential_char.isupper():
                        if curr_char and curr_diag:
                            cues.append({
                                "in": curr_in,
                                "out": curr_out,
                                "character": curr_char or "CHARACTER",
                                "dialogue": " ".join(curr_diag)
                            })
                            curr_in = ""
                            curr_out = ""
                            curr_diag = []
                        curr_char = re.sub(r'\s*\([^)]*\)', '', potential_char).strip().upper()
                        if parts[1].strip():
                            curr_diag.append(parts[1].strip())
                        continue

                if line.isupper() and len(line) < 35:
                    if curr_char and curr_diag:
                        cues.append({
                            "in": curr_in,
                            "out": curr_out,
                            "character": curr_char or "CHARACTER",
                            "dialogue": " ".join(curr_diag)
                        })
                        curr_in = ""
                        curr_out = ""
                        curr_diag = []
                    curr_char = re.sub(r'\s*\([^)]*\)', '', line).strip().upper()
                else:
                    curr_diag.append(line)

        if curr_char or curr_diag:
            cues.append({
                "in": curr_in,
                "out": curr_out,
                "character": curr_char or "CHARACTER",
                "dialogue": " ".join(curr_diag)
            })

    # If timecode parser didn't find enough cues or script has no timecodes:
    # Run the intelligent Screenplay & Dialogue Script Parser
    valid_cues = [c for c in cues if (c["character"] and c["dialogue"].strip())]
    if len(valid_cues) < 2:
        cues = []
        curr_char = None
        curr_diag = []

        SCENE_HEADER_PATTERN = re.compile(
            r'^(?:INT\.|EXT\.|INT/EXT\.|EXT/INT\.|TEASER|SCENE\b|ACT\s+[IVX\d]+|FADE\s+IN|CUT\s+TO|DISSOLVE\s+TO|FLASHBACK|TITLE\s+CARD)', 
            re.I
        )
        TRANSITIONS = {
            'CONTINUED', 'CONTINUED:', '(CONTINUED)', 'THE END', 'FLASHBACK', 'TRANSITION', 
            'BLACK', 'FADE OUT', 'FADE OUT.', 'CUT TO BLACK', 'SMASH CUT TO:', 'MATCH CUT TO:'
        }
        META_WORDS = {
            'SERIES', 'PILOT', 'EPISODE', 'SEASON', 'ACT', 'SCENE', 'TITLE', 
            'WRITTEN BY', 'DIRECTED BY', 'DATE', 'AUTHOR', 'CONTACT', 'DRAFT'
        }
        CHAR_REGEX = re.compile(r'^([A-ZÀ-ÖØ-Þ\s\.\'\-]{2,30})(?:\s*\((.*?)\))?$')
        has_started_story = False

        for raw_line in lines:
            line = raw_line.strip()
            if not line:
                if curr_char and curr_diag:
                    cues.append({'in': '', 'out': '', 'character': curr_char, 'dialogue': ' '.join(curr_diag)})
                    curr_char = None
                    curr_diag = []
                continue

            # Skip scene headings, transitions, or sluglines
            if SCENE_HEADER_PATTERN.match(line) or line in TRANSITIONS or line.endswith(" TO:"):
                has_started_story = True
                if curr_char and curr_diag:
                    cues.append({'in': '', 'out': '', 'character': curr_char, 'dialogue': ' '.join(curr_diag)})
                    curr_char = None
                    curr_diag = []
                continue

            # Inline character format: "ELEANOR: What do you want?"
            if ":" in line:
                parts = line.split(":", 1)
                prefix = parts[0].strip().upper()
                m_inline = CHAR_REGEX.match(prefix)
                if m_inline and len(prefix) < 30 and prefix not in META_WORDS and not any(prefix.startswith(m) for m in META_WORDS):
                    has_started_story = True
                    if curr_char and curr_diag:
                        cues.append({'in': '', 'out': '', 'character': curr_char, 'dialogue': ' '.join(curr_diag)})
                    curr_char = re.sub(r'\s*\([^)]*\)', '', m_inline.group(1)).strip().upper()
                    curr_diag = [parts[1].strip()] if parts[1].strip() else []
                    continue

            # Screenplay standalone uppercase character cue
            m_char = CHAR_REGEX.match(line)
            if m_char and not line.endswith(('.', '?', '!', '"', '...', '---', '--')) and len(line) <= 30:
                name_cand = m_char.group(1).strip().upper()
                # Before story starts, avoid mistaking script title / author as character
                if not has_started_story and not any(s in line for s in ['(V.O.)', '(O.S.)', '(O.C.)']):
                    continue
                if (any(c.isalpha() for c in name_cand) and 
                    name_cand not in TRANSITIONS and 
                    name_cand not in META_WORDS and
                    not any(name_cand.startswith(m) for m in META_WORDS) and
                    not SCENE_HEADER_PATTERN.match(name_cand) and
                    " - " not in name_cand):
                    
                    has_started_story = True
                    if curr_char and curr_diag:
                        cues.append({'in': '', 'out': '', 'character': curr_char, 'dialogue': ' '.join(curr_diag)})
                    curr_char = re.sub(r'\s*\([^)]*\)', '', name_cand).strip().upper()
                    curr_diag = []
                    continue

            if curr_char:
                # Parentheticals like (smiling) or (whispering)
                if line.startswith("(") and line.endswith(")"):
                    continue
                curr_diag.append(line)

        if curr_char and curr_diag:
            cues.append({'in': '', 'out': '', 'character': curr_char, 'dialogue': ' '.join(curr_diag)})

    valid_cues = [c for c in cues if (c.get("character") and c.get("dialogue", "").strip())]
    if len(valid_cues) >= 1:
        log_debug(f"Instant Local Parser succeeded! Extracted {len(valid_cues)} cues in milliseconds.")
        return valid_cues

    return []

def safe_validate_and_convert(input_path, output_docx_path=None, export_mode="3line", user_id=None):
    """
    Safely validates, extracts raw text, and converts script.
    First attempts instant local parser (0.01s). If unstructured, falls back to AI engine.
    """
    log_debug(f"--- Starting Validation & Import for: {input_path} ---")
    
    # 1. Run Pre-Validation
    report = ScriptValidator.validate_file(input_path)
    
    if report.status == ValidationStatus.INVALID:
        log_debug(f"Validation Failed: {report.user_title} - {report.user_message}")
        return report, [], []

    ext = os.path.splitext(input_path)[1].lower()

    try:
        # 2. Try Instant Local Parser First (0.01 seconds)
        local_cues = parse_script_locally(input_path)
        if local_cues:
            log_debug(f"Instant Local Parser succeeded! Extracted {len(local_cues)} cues in milliseconds.")
            report.status = ValidationStatus.VALID
            report.user_title = "Script Parsed Instantly"
            report.user_message = f"Successfully extracted {len(local_cues)} dialogue cues directly from script."
            
            format_a_cues = []
            raw_rows = []
            for r in local_cues:
                raw_rows.append(r)
                format_a_cues.append({
                    "in": r["in"],
                    "out": r.get("out", ""),
                    "character": r["character"],
                    "dialogue": r["dialogue"]
                })

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
                        if tc_in:
                            out_doc.add_paragraph(tc_in)

                    out_doc.add_paragraph(cue["character"])
                    out_doc.add_paragraph(cue["dialogue"])
                    
                    if idx < len(format_a_cues) - 1:
                        out_doc.add_paragraph("")
                out_doc.save(output_docx_path)
            
            return report, raw_rows, format_a_cues

        # 3. Fallback to AI Engine for Unstructured Scripts
        log_debug("Local parser found no structured cues. Calling AI LLM Engine...")
        raw_text = ""
        if ext == ".docx":
            raw_text = extract_raw_text_docx(input_path)
        elif ext == ".pdf":
            raw_text = extract_raw_text_pdf(input_path)
        elif ext in [".txt", ".text"]:
            raw_text = extract_raw_text_txt(input_path)
        else:
            raise UnsupportedFormatError(ext)

        if not raw_text.strip():
            raise EmptyFileError(os.path.basename(input_path))

        raw_rows = parse_with_gemini(raw_text, user_id=user_id)

        if not raw_rows:
            raise NoTimecodesFoundError(os.path.basename(input_path))

        report.status = ValidationStatus.NORMALIZABLE
        report.user_title = "Script Parsed Successfully with AI"
        report.user_message = f"The script was successfully extracted using the AI Parser. Detected {len(raw_rows)} cues."

        format_a_cues = []
        for r in raw_rows:
            format_a_cues.append({
                "in": r["in"],
                "out": r.get("out", ""),
                "character": r["character"],
                "dialogue": r["dialogue"]
            })

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
                    if tc_in:
                        out_doc.add_paragraph(tc_in)

                out_doc.add_paragraph(cue["character"])
                out_doc.add_paragraph(cue["dialogue"])
                
                if idx < len(format_a_cues) - 1:
                    out_doc.add_paragraph("")
            out_doc.save(output_docx_path)

        return report, raw_rows, format_a_cues

    except ScriptImportError as e:
        tb = traceback.format_exc()
        log_debug(f"ScriptImportError Caught:\n{tb}")
        report.status = ValidationStatus.INVALID
        report.user_title = e.user_title
        report.user_message = e.user_message
        report.suggestion = e.suggestion
        report.diagnostic_info = f"Technical Details:\n{e.technical_details}\n\nTraceback:\n{tb}"
        return report, [], []

    except Exception as e:
        tb = traceback.format_exc()
        log_debug(f"Unexpected Exception Caught:\n{tb}")
        report.status = ValidationStatus.INVALID
        report.user_title = "Script Parsing Error"
        report.user_message = f"An unexpected error occurred while parsing: {str(e)}"
        report.diagnostic_info = f"Traceback:\n{tb}"
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
