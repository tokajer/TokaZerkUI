'use strict';

// Launches the real app, screenshots the window and exits.
// Run with: npx electron test/smoke.js [output.png]

const { app, BrowserWindow } = require('electron');
const fs = require('fs');

const outFile = process.argv[2] || 'smoke.png';

require('../main.js');

app.whenReady().then(() => {
  setTimeout(async () => {
    try {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) throw new Error('no window created');
      const image = await win.webContents.capturePage();
      fs.writeFileSync(outFile, image.toPNG());
      console.log(`smoke: screenshot written to ${outFile}`);
      app.exit(0);
    } catch (err) {
      console.error('smoke: FAILED:', err);
      app.exit(1);
    }
  }, Number(process.env.SMOKE_DELAY) || 4500);
});
