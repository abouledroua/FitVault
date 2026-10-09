# FitVault - Smart Athletic Operations & Member Treasury

## Overview
FitVault is a full-stack, responsive Gym & Multi-Sport Complex Management application with an ultra-modern dark luxury UI, designed to manage members, inventory, attendance, and treasury ("Gestion de Caisse"). It features native desktop packaging via Electron, printable member badges with barcodes, and dual-mode inventory.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MySQL (Standalone, WampServer, or Docker)
- Git (optional)

### 1. Database Setup
FitVault provides an automatic fallback database setup script.
By default, it attempts to connect to `localhost:3306` with `root` (no password) or a fallback `citrus` user.
Run the database setup script to verify connection and initialize via Docker if needed:
```bash
powershell -ExecutionPolicy Bypass -File .\setup-db.ps1
```
Or manually run the `schema.sql` file in your database GUI.

### 2. Environment Variables
Copy the example environment file:
```bash
copy .env.example .env
```
Ensure the variables match your database credentials.

### 3. Install Dependencies
```bash
npm install
npm install mysql2 react-barcode jsbarcode recharts lucide-react
npm install --save-dev electron electron-builder
```

### 4. Running the App (Development)
You can run the web app and desktop shell concurrently:
```bash
.\start-app.bat
```
Alternatively, just for the web version:
```bash
npm run dev
```

### 5. Desktop Packaging
To build the static React files and package the Windows executable:
```bash
.\package-desktop.bat
```
The output will be inside the `dist-desktop` folder.
