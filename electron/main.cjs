/* eslint-disable */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const http = require('http');

let mainWindow = null;
let splash = null;
let serverProcess = null;

const PORT = process.env.PORT || 3456;

function startNextServer() {
  return new Promise((resolve) => {
    // If running in development mode with an external dev server
    if (!app.isPackaged && process.env.NODE_ENV === 'development') {
      return resolve('http://localhost:3000');
    }

    const serverPath = app.isPackaged
      ? path.join(process.resourcesPath, 'standalone', 'server.js')
      : path.join(__dirname, '..', '.next', 'standalone', 'server.js');

    console.log('[FitVault] Starting Next.js standalone server from:', serverPath);

    serverProcess = fork(serverPath, [], {
      env: {
        ...process.env,
        PORT: String(PORT),
        HOSTNAME: '127.0.0.1',
        NODE_ENV: 'production'
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });

    serverProcess.stdout?.on('data', (data) => {
      console.log(`[Next.js]: ${data}`);
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error(`[Next.js Error]: ${data}`);
    });

    serverProcess.on('error', (err) => {
      console.error('[Next.js Process Error]:', err);
    });

    const targetUrl = `http://127.0.0.1:${PORT}`;

    // Poll until server responds
    let attempts = 0;
    const maxAttempts = 60; // 15 seconds max

    const checkServer = () => {
      attempts++;
      const req = http.get(targetUrl, (res) => {
        console.log('[FitVault] Next.js server is ready at', targetUrl);
        resolve(targetUrl);
      });

      req.on('error', () => {
        if (attempts >= maxAttempts) {
          console.error('[FitVault] Timeout waiting for Next.js server');
          resolve(targetUrl); // Try loading anyway
        } else {
          setTimeout(checkServer, 250);
        }
      });
    };

    setTimeout(checkServer, 300);
  });
}

function createWindow(startUrl) {
  splash = new BrowserWindow({
    width: 600,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    icon: path.join(__dirname, '..', 'public', 'app.ico'),
    webPreferences: {
      nodeIntegration: true,
    }
  });

  splash.loadFile(path.join(__dirname, 'splash.html'));

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: 'FitVault - Smart Athletic Operations',
    icon: path.join(__dirname, '..', 'public', 'app.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splash && !splash.isDestroyed()) {
        splash.destroy();
        splash = null;
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.maximize();
      }
    }, 1500);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      const url = await startNextServer();
      createWindow(url);
    } catch (err) {
      console.error('[FitVault] Failed to initialize:', err);
    }

    ipcMain.handle('print-badge', async (event, printerName) => {
      if (mainWindow) {
        mainWindow.webContents.print({ silent: true, printBackground: true, deviceName: printerName });
      }
      return { success: true };
    });

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0 && mainWindow === null) {
        createWindow(`http://127.0.0.1:${PORT}`);
      }
    });
  });
}

function cleanUpProcesses() {
  if (serverProcess) {
    try {
      serverProcess.kill('SIGTERM');
    } catch (e) {}
    serverProcess = null;
  }
}

app.on('before-quit', cleanUpProcesses);
app.on('will-quit', cleanUpProcesses);

app.on('window-all-closed', function () {
  cleanUpProcesses();
  if (process.platform !== 'darwin') app.quit();
});
