[Setup]
; FitVault Installer Configuration
AppId={{9F579044-884A-4D78-9B94-F8E35A2BD364}
AppName=FitVault
AppVersion=1.0.0
AppPublisher=FitVault Solutions
AppPublisherURL=https://fitvault.local
AppSupportURL=https://fitvault.local/support
AppUpdatesURL=https://fitvault.local/updates
DefaultDirName={autopf}\FitVault
DefaultGroupName=FitVault
AllowNoIcons=yes
OutputDir=..\dist-installer
OutputBaseFilename=FitVault-Setup-with-MySQL
SetupIconFile=app.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "installnode"; Description: "Installer l'environnement d'execution Node.js (Requis si non installe)"; GroupDescription: "Composants Prérequis"; Flags: checkedonce
Name: "installmysql"; Description: "Installer ou configurer automatiquement le serveur MySQL et la base de donnees"; GroupDescription: "Composants Prérequis"; Flags: checkedonce

[Files]
; FitVault Icon
Source: "app.ico"; DestDir: "{app}"; Flags: ignoreversion

; Configuration and schema files
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package-lock.json"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\schema.sql"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\setup-db.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\.env.example"; DestDir: "{app}"; DestName: ".env"; Flags: onlyifdoesntexist
Source: "..\.env"; DestDir: "{app}"; Flags: onlyifdoesntexist skipifsourcedoesntexist
Source: "..\start-app.bat"; DestDir: "{app}"; Flags: ignoreversion

; Application Code Sources
Source: "..\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\next.config.ts"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\tsconfig.json"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

; Electron build if present
Source: "..\electron\*"; DestDir: "{app}\electron"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "..\dist-desktop\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist; Check: HasUnpackedDesktop

; Installer automation scripts
Source: "scripts\*"; DestDir: "{app}\installer\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs

; Bundled Node.js & MySQL Installers
Source: "prerequisites\*"; DestDir: "{app}\installer\prerequisites"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "mysql\*"; DestDir: "{tmp}\mysql"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist; Tasks: installmysql; Check: HasBundledMySql

[Icons]
Name: "{group}\FitVault"; Filename: "{app}\start-app.bat"; IconFilename: "{app}\app.ico"
Name: "{group}\{cm:UninstallProgram,FitVault}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\FitVault"; Filename: "{app}\start-app.bat"; Tasks: desktopicon; IconFilename: "{app}\app.ico"

[Run]
; 1. Install Node.js prerequisite silently if selected and missing
Filename: "msiexec.exe"; Parameters: "/i ""{app}\installer\prerequisites\node-setup.msi"" /qn /norestart"; StatusMsg: "Installation du runtime Node.js..."; Tasks: installnode; Check: NeedsNodeInstall

; 2. Run MySQL & DB Initialization via PowerShell
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -NoProfile -File ""{app}\installer\scripts\setup-mysql.ps1"""; StatusMsg: "Configuration et initialisation de MySQL et de la base de données FitVault..."; Flags: runhidden waituntilterminated; Tasks: installmysql

; 3. Launch application after setup
Filename: "{app}\start-app.bat"; Description: "{cm:LaunchProgram,FitVault}"; Flags: nowait postinstall skipifsilent

[Code]
function NeedsNodeInstall(): Boolean;
begin
  Result := (not FileExists('C:\Program Files\nodejs\node.exe')) and FileExists(ExpandConstant('{app}\installer\prerequisites\node-setup.msi'));
end;

function HasUnpackedDesktop(): Boolean;
begin
  Result := FileExists(ExpandConstant('{app}\FitVault.exe')) or DirExists(ExpandConstant('..\dist-desktop\win-unpacked'));
end;

function HasBundledMySql(): Boolean;
begin
  Result := DirExists(ExpandConstant('mysql'));
end;
