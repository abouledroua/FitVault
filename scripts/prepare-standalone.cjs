const fs = require('fs');
const path = require('path');

function copyFolderRecursive(source, target) {
  if (!fs.existsSync(source)) return;
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursive(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

const rootDir = path.resolve(__dirname, '..');
const staticSrc = path.join(rootDir, '.next', 'static');
const staticDest = path.join(rootDir, '.next', 'standalone', '.next', 'static');
const publicSrc = path.join(rootDir, 'public');
const publicDest = path.join(rootDir, '.next', 'standalone', 'public');

console.log('Copying .next/static to .next/standalone/.next/static...');
copyFolderRecursive(staticSrc, staticDest);

console.log('Copying public to .next/standalone/public...');
copyFolderRecursive(publicSrc, publicDest);

function fixSymlinks(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(full);
      const resolved = path.resolve(dir, linkTarget);
      fs.unlinkSync(full);
      if (fs.existsSync(resolved)) {
        if (fs.statSync(resolved).isDirectory()) {
          copyFolderRecursive(resolved, full);
        } else {
          fs.copyFileSync(resolved, full);
        }
        console.log(`Replaced symlink ${item} with real content from ${resolved}`);
      } else {
        console.log(`Removed broken symlink ${item}`);
      }
    } else if (stat.isDirectory()) {
      fixSymlinks(full);
    }
  }
}

console.log('Fixing symlinks in standalone directory...');
fixSymlinks(path.join(rootDir, '.next', 'standalone'));

console.log('Standalone build preparation complete!');
