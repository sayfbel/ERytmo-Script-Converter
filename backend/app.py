import sys
import os
if getattr(sys, 'frozen', False):
    root_dir = sys._MEIPASS
else:
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, root_dir)

import webview
import threading
import uvicorn
from backend.main import app
import time

import subprocess
import webbrowser
import shutil

def open_in_system_chrome(url: str):
    """
    Launches the user's actual desktop Google Chrome browser so that the user's
    existing logged-in Google accounts are immediately visible (account chooser),
    with zero need to manually re-type email and password.
    """
    chrome_paths = [
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
    ]
    chrome_exe = None
    for path in chrome_paths:
        if os.path.exists(path):
            chrome_exe = path
            break

    if not chrome_exe:
        chrome_exe = shutil.which("chrome") or shutil.which("google-chrome")

    if chrome_exe:
        try:
            # Opens a new window in the user's desktop Google Chrome with their logged-in accounts
            proc = subprocess.Popen([
                chrome_exe,
                "--new-window",
                url
            ])
            return proc
        except Exception as e:
            print(f"[AUTH] Failed to launch Chrome: {e}")

    # Fallback to system default browser
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"[AUTH] Failed to launch browser: {e}")
    return None

class DesktopApi:
    def __init__(self):
        self.auth_process = None

    def open_google_auth(self, session_id: str, oauth_url: str = None):
        """
        Opens Google OAuth in the user's actual desktop Google Chrome
        so their existing accounts are immediately visible to select with 1 click.
        """
        if self.auth_process and self.auth_process.poll() is None:
            return  # Already running, prevent duplicate window

        if not oauth_url:
            from backend.routes.auth import get_google_oauth_url
            oauth_url = get_google_oauth_url(session_id)

        self.auth_process = open_in_system_chrome(oauth_url)

    def close_google_auth(self):
        """
        Closes the Chrome window once authentication succeeds.
        """
        if self.auth_process:
            try:
                self.auth_process.terminate()
            except Exception:
                pass
            self.auth_process = None

desktop_api = DesktopApi()

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")

if __name__ == '__main__':
    # Start the FastAPI server in a background thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # Wait a bit for the server to start
    time.sleep(1.5)

    # Create local storage directory for WebView2 session and cookie persistence
    storage_dir = os.path.join(root_dir, ".webview_storage")
    os.makedirs(storage_dir, exist_ok=True)

    # Launch PyWebView window pointing to the local server
    webview.create_window(
        title="ERytmo Script Converter v2", 
        url="http://localhost:8000",
        width=1200,
        height=800,
        min_size=(950, 650),
        js_api=desktop_api
    )
    webview.start(
        private_mode=False,
        storage_path=storage_dir,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    )
