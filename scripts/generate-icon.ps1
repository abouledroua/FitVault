Add-Type -AssemblyName System.Drawing

$size = 512
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Clear background with transparency
$g.Clear([System.Drawing.Color]::Transparent)

# Draw rounded dark container (#0B0F17)
$rect = New-Object System.Drawing.Rectangle 16, 16, 480, 480
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$radius = 96
$path.AddArc(16, 16, $radius, $radius, 180, 90)
$path.AddArc(496 - $radius, 16, $radius, $radius, 270, 90)
$path.AddArc(496 - $radius, 496 - $radius, $radius, $radius, 0, 90)
$path.AddArc(16, 496 - $radius, $radius, $radius, 90, 90)
$path.CloseFigure()

$bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 11, 15, 23))
$g.FillPath($bgBrush, $path)

$borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 30, 41, 59), 8)
$g.DrawPath($borderPen, $path)

# Draw gradient shield and emblem
$gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (
    (New-Object System.Drawing.Point 128, 96),
    (New-Object System.Drawing.Point 384, 400),
    ([System.Drawing.Color]::FromArgb(255, 6, 182, 212)),  # Cyan #06B6D4
    ([System.Drawing.Color]::FromArgb(255, 16, 185, 129))  # Emerald #10B981
)

$shieldPen = New-Object System.Drawing.Pen ($gradBrush, 18)
$shieldPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$shieldPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$shieldPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

# Shield points
$pts = @(
    (New-Object System.Drawing.Point 256, 110),
    (New-Object System.Drawing.Point 380, 160),
    (New-Object System.Drawing.Point 380, 260),
    (New-Object System.Drawing.Point 256, 400),
    (New-Object System.Drawing.Point 132, 260),
    (New-Object System.Drawing.Point 132, 160)
)
$g.DrawPolygon($shieldPen, $pts)

# Dumbbell / bars inside shield
$barPen = New-Object System.Drawing.Pen ($gradBrush, 18)
$barPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$barPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

$g.DrawLine($barPen, 216, 210, 216, 310)
$g.DrawLine($barPen, 256, 180, 256, 340)
$g.DrawLine($barPen, 296, 210, 296, 310)

$pngPath = Join-Path $PSScriptRoot "..\public\icon.png"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()

Write-Output "Successfully generated 512x512 icon at: $pngPath"
