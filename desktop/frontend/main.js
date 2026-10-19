const { app, BrowserWindow } = require('electron');
const serve = require('electron-serve');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const loadURL = serve({ directory: 'out' });

let mainWindow;
let pythonProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'out/dubflow_icon.png'),
    autoHideMenuBar: true
  });

  // load Next.js static files
  loadURL(mainWindow);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startPythonBackend() {
  const rootPath = path.join(__dirname, '..');
  const backendPath = path.join(rootPath, 'backend');
  
  // Try finding venv python first (cross-platform Linux/Mac/Windows)
  const isWin = process.platform === 'win32';
  const venvPython = isWin
    ? path.join(backendPath, 'venv', 'Scripts', 'python.exe')
    : path.join(backendPath, 'venv', 'bin', 'python');
  
  // Pass system and project environment to backend
  const env = { ...process.env };
  
  // Run uvicorn on port 8000
  try {
    pythonProcess = spawn(venvPython, ['-m', 'uvicorn', 'backend.main:app', '--port', '8000'], {
      cwd: rootPath,
      env: env,
      stdio: 'pipe'
    });

    pythonProcess.stdout.on('data', (data) => {
      console.log(`[Backend stdout]: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`[Backend stderr]: ${data}`);
    });

    pythonProcess.on('error', (err) => {
      console.warn('Failed to start python backend using venv, trying system python3...', err.message);
      pythonProcess = spawn('python3', ['-m', 'uvicorn', 'backend.main:app', '--port', '8000'], {
        cwd: rootPath,
        env: env,
        stdio: 'pipe'
      });
      
      pythonProcess.stdout.on('data', (data) => {
        console.log(`[Backend stdout]: ${data}`);
      });
  
      pythonProcess.stderr.on('data', (data) => {
        console.error(`[Backend stderr]: ${data}`);
      });
    });
  } catch (error) {
    console.error("Error launching python backend:", error);
  }
}

app.on('ready', () => {
  startPythonBackend();
  // Wait a small moment to ensure the backend starts before window opens
  setTimeout(createWindow, 1000);
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  console.log("Shutting down Python backend...");
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
