/* eslint-disable */
const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');
const crypto = require('crypto');

// Generate a deterministic hardware UUID based on network interfaces and hostname
function generateHardwareUUID() {
  const interfaces = os.networkInterfaces();
  let macString = '';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
        macString += iface.mac;
      }
    }
  }
  const hostname = os.hostname();
  const rawId = `${hostname}-${macString}`;
  return crypto.createHash('sha256').update(rawId).digest('hex').substring(0, 32);
}

contextBridge.exposeInMainWorld('electronAPI', {
  deviceUUID: generateHardwareUUID(),
  printBadge: (printerName) => ipcRenderer.invoke('print-badge', printerName)
});
