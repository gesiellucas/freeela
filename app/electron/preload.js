const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  createProjectFolders: (data) => ipcRenderer.invoke('create-project-folders', data),
});
