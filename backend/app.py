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

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")

if __name__ == '__main__':
    # Start the FastAPI server in a background thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # Wait a bit for the server to start
    time.sleep(1.5)

    # Launch PyWebView window pointing to the local server
    webview.create_window(
        title="ERytmo Script Converter v2", 
        url="http://127.0.0.1:8000",
        width=1200,
        height=800,
        min_size=(950, 650)
    )
    webview.start()
