const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Freeela - Freelance OS',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// IPC: Trazer janela ao foco (usado pelo Pomodoro ao fim do timer)
ipcMain.handle('focus-window', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// IPC: Selecionar pasta raiz
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Selecione a pasta raiz dos projetos',
  });

  if (result.canceled) return null;
  return result.filePaths[0];
});

// IPC: Criar estrutura de pastas do projeto
ipcMain.handle('create-project-folders', async (_event, { rootPath, clientName, folders }) => {
  try {
    const year = new Date().getFullYear();
    const folderName = `Cliente_${clientName.replace(/\s+/g, '_')}_${year}`;
    const clientRoot = path.join(rootPath, folderName);

    for (const folder of folders) {
      const fullPath = path.join(clientRoot, folder);
      fs.mkdirSync(fullPath, { recursive: true });
    }

    return { success: true, path: clientRoot };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
