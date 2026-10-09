@echo off
echo Packaging FitVault for Desktop...

echo Building Next.js static export...
call npm run build

echo Packaging with electron-builder...
call npx electron-builder --config electron-builder.json

echo Done! Executable is in dist-desktop/
pause
