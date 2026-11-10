Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\char_liana\c00_complete.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $bmp.Width; $h = $bmp.Height

$scratchDir = Join-Path $root 'scratch\liana_parts_preview'
if (-not (Test-Path $scratchDir)) { New-Item -ItemType Directory -Path $scratchDir -Force }

# 1. 방패 영역 (X=570..800, Y=420..760)
$shieldBmp = New-Object System.Drawing.Bitmap(300, 400)
$g = [System.Drawing.Graphics]::FromImage($shieldBmp)
$g.DrawImage($bmp, [System.Drawing.Rectangle]::new(0, 0, 300, 400), [System.Drawing.Rectangle]::new(560, 410, 300, 400), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$shieldBmp.Save((Join-Path $scratchDir 'preview_shield.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$shieldBmp.Dispose()

# 2. 칼 영역 (X=100..420, Y=600..950)
$swordBmp = New-Object System.Drawing.Bitmap(350, 400)
$g = [System.Drawing.Graphics]::FromImage($swordBmp)
$g.DrawImage($bmp, [System.Drawing.Rectangle]::new(0, 0, 350, 400), [System.Drawing.Rectangle]::new(100, 600, 350, 400), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$swordBmp.Save((Join-Path $scratchDir 'preview_sword.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$swordBmp.Dispose()

# 3. 얼굴 영역 (X=400..630, Y=200..420)
$faceBmp = New-Object System.Drawing.Bitmap(250, 250)
$g = [System.Drawing.Graphics]::FromImage($faceBmp)
$g.DrawImage($bmp, [System.Drawing.Rectangle]::new(0, 0, 250, 250), [System.Drawing.Rectangle]::new(400, 200, 250, 250), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$faceBmp.Save((Join-Path $scratchDir 'preview_face.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$faceBmp.Dispose()

# 4. 상의 흉갑 영역 (X=400..620, Y=390..600)
$topBmp = New-Object System.Drawing.Bitmap(250, 250)
$g = [System.Drawing.Graphics]::FromImage($topBmp)
$g.DrawImage($bmp, [System.Drawing.Rectangle]::new(0, 0, 250, 250), [System.Drawing.Rectangle]::new(390, 390, 250, 250), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$topBmp.Save((Join-Path $scratchDir 'preview_top.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$topBmp.Dispose()

$bmp.Dispose()
Write-Host "Crop previews generated in: $scratchDir"

