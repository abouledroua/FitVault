Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="FitVault Launcher" 
        Height="420" Width="680" 
        WindowStartupLocation="CenterScreen" 
        WindowStyle="None" 
        AllowsTransparency="True" 
        Background="Transparent"
        Topmost="True"
        ShowInTaskbar="True">
    <Border CornerRadius="16" Background="#0B0F17" BorderBrush="#1E293B" BorderThickness="1.5">
        <Border.Effect>
            <DropShadowEffect Color="#000000" BlurRadius="25" ShadowDepth="8" Opacity="0.6"/>
        </Border.Effect>
        <Grid Margin="30">
            <Grid.RowDefinitions>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="*"/>
                <RowDefinition Height="Auto"/>
            </Grid.RowDefinitions>

            <!-- Header with Logo and Brand -->
            <StackPanel Grid.Row="0" Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,10,0,15">
                <Border Width="48" Height="48" CornerRadius="12" Background="#0F172A" BorderBrush="#06B6D4" BorderThickness="1.5" Margin="0,0,16,0">
                    <TextBlock Text="FV" Foreground="#10B981" FontWeight="Bold" FontSize="20" HorizontalAlignment="Center" VerticalAlignment="Center"/>
                </Border>
                <StackPanel VerticalAlignment="Center">
                    <TextBlock Text="FitVault" Foreground="#F8FAFC" FontSize="26" FontWeight="Bold"/>
                    <TextBlock Text="Smart Athletic Operations &amp; Member Treasury" Foreground="#94A3B8" FontSize="13"/>
                </StackPanel>
            </StackPanel>

            <!-- Current Step Status -->
            <StackPanel Grid.Row="1" Margin="0,10,0,15">
                <TextBlock x:Name="TxtStatus" Text="Initialisation du syst&#232;me..." Foreground="#38BDF8" FontSize="14" FontWeight="SemiBold" TextAlignment="Center"/>
                <ProgressBar x:Name="PrgBar" Height="6" Margin="0,12,0,0" Background="#1E293B" Foreground="#10B981" BorderThickness="0" Value="10" Maximum="100"/>
            </StackPanel>

            <!-- Live Logs Console -->
            <Border Grid.Row="2" Background="#020617" CornerRadius="10" BorderBrush="#1E293B" BorderThickness="1" Padding="12">
                <ScrollViewer x:Name="ScrollLog" VerticalScrollBarVisibility="Auto">
                    <TextBlock x:Name="TxtLog" Text="[*] Initialisation du lanceur FitVault..." Foreground="#A5B4FC" FontFamily="Consolas, 'Cascadia Code', Courier New" FontSize="12" TextWrapping="Wrap"/>
                </ScrollViewer>
            </Border>

            <!-- Footer -->
            <Grid Grid.Row="3" Margin="0,15,0,0">
                <TextBlock Text="D&#233;marrage automatique en cours..." Foreground="#64748B" FontSize="12" VerticalAlignment="Center"/>
                <TextBlock x:Name="TxtVersion" Text="v1.0.0" Foreground="#64748B" FontSize="12" HorizontalAlignment="Right" VerticalAlignment="Center"/>
            </Grid>
        </Grid>
    </Border>
</Window>
"@

$reader = [System.Xml.XmlReader]::Create([System.IO.StringReader]::new($xaml))
$window = [System.Windows.Markup.XamlReader]::Load($reader)

$txtStatus = $window.FindName("TxtStatus")
$txtLog = $window.FindName("TxtLog")
$scrollLog = $window.FindName("ScrollLog")
$prgBar = $window.FindName("PrgBar")

$worker = New-Object System.ComponentModel.BackgroundWorker
$worker.WorkerReportsProgress = $true

$worker.add_DoWork({
    param($sender, $e)
    
    function Report($progress, $status, $logMsg) {
        $sender.ReportProgress($progress, @{ Status = $status; Message = $logMsg })
    }

    $appDir = Resolve-Path "$PSScriptRoot\.."
    Set-Location $appDir

    Report 10 "1/4 - V&#233;rification de l'environnement..." "[*] Dossier de l'application : $appDir"
    Start-Sleep -Milliseconds 500

    # 1. Check Node.js
    $nodeCmd = Get-Command "node.exe" -ErrorAction SilentlyContinue
    if (-not $nodeCmd) {
        Report 20 "Installation de Node.js..." "[!] Node.js manquant, installation du runtime..."
        $nodeMsi = "$appDir\installer\prerequisites\node-setup.msi"
        if (Test-Path $nodeMsi) {
            Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsi`" /qn /norestart" -Wait
            $env:PATH += ";C:\Program Files\nodejs"
            Report 35 "Node.js install&#233;" "[+] Runtime Node.js install&#233; avec succ&#232;s."
        } else {
            Report 0 "Erreur : Node.js manquant" "[ERREUR] Le composant Node.js est introuvable."
            Start-Sleep -Seconds 3
            return
        }
    } else {
        Report 25 "1/4 - Runtime Node.js d&#233;tect&#233;" "[+] Node.js pr&#234;t : $($nodeCmd.Source)"
    }

    # 2. Check & Run MySQL setup
    Report 40 "2/4 - Configuration de la base de donn&#233;es..." "[*] V&#233;rification du serveur MySQL (Port 3306)..."
    $setupMysqlScript = "$appDir\installer\scripts\setup-mysql.ps1"
    if (Test-Path $setupMysqlScript) {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "powershell.exe"
        $psi.Arguments = "-ExecutionPolicy Bypass -NoProfile -File `"$setupMysqlScript`" -Silent"
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true

        $proc = [System.Diagnostics.Process]::Start($psi)
        while (-not $proc.HasExited) {
            $line = $proc.StandardOutput.ReadLine()
            if ($line) { Report 50 "Configuration de MySQL..." $line }
        }
        $rest = $proc.StandardOutput.ReadToEnd()
        if ($rest) { Report 55 "Configuration de MySQL..." $rest }
        if ($proc.ExitCode -ne 0) {
            Report 55 "Avertissement MySQL" "[!] Consultez logs\database-setup.log pour les d&#233;tails."
        }
    }
    Report 60 "2/4 - Base de donn&#233;es pr&#234;te" "[+] Base de donn&#233;es op&#233;rationnelle."

    # 3. Environment file check
    if (-not (Test-Path "$appDir\.env")) {
        if (Test-Path "$appDir\.env.example") {
            Copy-Item "$appDir\.env.example" "$appDir\.env"
            Report 65 "Configuration" "[+] Fichier .env initialis&#233;."
        }
    }

    # 4. Check node_modules dependencies
    if (-not (Test-Path "$appDir\node_modules")) {
        Report 70 "3/4 - Installation des d&#233;pendances..." "[*] Installation des modules npm..."
        $npmPsi = New-Object System.Diagnostics.ProcessStartInfo
        $npmPsi.FileName = "cmd.exe"
        $npmPsi.Arguments = "/c npm install --omit=dev"
        $npmPsi.WorkingDirectory = $appDir
        $npmPsi.RedirectStandardOutput = $true
        $npmPsi.RedirectStandardError = $true
        $npmPsi.UseShellExecute = $false
        $npmPsi.CreateNoWindow = $true
        $npmProc = [System.Diagnostics.Process]::Start($npmPsi)
        while (-not $npmProc.HasExited) {
            $nLine = $npmProc.StandardOutput.ReadLine()
            if ($nLine) { Report 75 "Installation des modules..." $nLine }
        }
        Report 85 "3/4 - Modules install&#233;s" "[+] D&#233;pendances pr&#234;tes."
    }

    # 5. Start Server
    Report 90 "4/4 - D&#233;marrage du serveur..." "[*] Lancement du service Next.js..."
    $serverPsi = New-Object System.Diagnostics.ProcessStartInfo
    $serverPsi.FileName = "cmd.exe"
    $serverPsi.Arguments = "/c npm run dev"
    $serverPsi.WorkingDirectory = $appDir
    $serverPsi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
    $serverPsi.CreateNoWindow = $true
    $serverPsi.UseShellExecute = $false
    [System.Diagnostics.Process]::Start($serverPsi)

    # 6. Wait for HTTP 3000 to respond
    Report 95 "D&#233;marrage de l'interface..." "[*] En attente de http://localhost:3000..."
    $ready = $false
    $timeout = 25
    while ($timeout -gt 0 -and -not $ready) {
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($resp.StatusCode -eq 200) { $ready = $true }
        } catch {
            Start-Sleep -Seconds 1
            $timeout--
        }
    }

    Report 100 "FitVault est pr&#234;t !" "[+] Ouverture dans le navigateur..."
    Start-Sleep -Milliseconds 600

    # Launch browser
    Start-Process "http://localhost:3000"
    Start-Sleep -Seconds 1
})

$worker.add_ProgressChanged({
    param($sender, $e)
    $data = $e.UserState
    if ($data.Status) { $txtStatus.Text = [System.Web.HttpUtility]::HtmlDecode($data.Status) }
    if ($data.Message) { 
        $txtLog.Text += "`n" + [System.Web.HttpUtility]::HtmlDecode($data.Message)
        $scrollLog.ScrollToEnd()
    }
    if ($e.ProgressPercentage -ge 0) {
        $prgBar.Value = $e.ProgressPercentage
    }
})

$worker.add_RunWorkerCompleted({
    param($sender, $e)
    $window.Close()
})

$window.add_Loaded({
    $worker.RunWorkerAsync()
})

[void]$window.ShowDialog()
