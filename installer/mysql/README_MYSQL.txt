# Instructions pour les fichiers d'installation MySQL

Pour que l'installeur (InstallShield ou Inno Setup) puisse installer MySQL automatiquement hors-ligne :

1. Téléchargez le programme d'installation MySQL officiel (MSI) :
   - Recommandé : `mysql-installer-community-*.msi` ou `mysql-server-*.msi` depuis https://dev.mysql.com/downloads/installer/
2. Placez le fichier `.msi` téléchargé dans ce dossier :
   `installer\mysql\`
3. Renommez-le ou assurez-vous qu'il porte l'extension `.msi`.

### Fonctionnement lors de l'installation :
- Si un fichier `.msi` est présent dans `installer\mysql\`, l'installeur l'exécute silencieusement (`/qn /norestart`).
- Si aucun fichier n'est présent mais que le système a une connexion internet, le script utilise automatiquement `winget install Oracle.MySQL` ou détecte une instance MySQL/MariaDB existante (Wamp, XAMPP, Laragon, Docker).
- Le script `installer\scripts\setup-mysql.ps1` configure automatiquement la base de données `fitvault_db`, l'utilisateur `citrus`, et importe la structure `schema.sql`.
