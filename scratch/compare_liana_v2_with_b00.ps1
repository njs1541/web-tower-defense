Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$b00Path = Join-Path $root 'test\incoming\body_human\b00_master.png'
$lianaPath = 'C:\Users\NZIN\.gemini\antigravity\brain\a9b248b5-71cd-4fef-a353-af82a1fa0bb5\c00_complete_liana_v2_1794295493871.jpg'

$b00 = [System.Drawing.Bitmap]::FromFile($b00Path)
$liana = [System.Drawing.Bitmap]::FromFile($lianaPath)

$w = $b00.Width; $h = $b00.Height

# 50:50 합성 이미지 생성
$overlay = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($overlay)
$g.Clear([System.Drawing.Color]::White)

$attr = New-Object System.Drawing.Imaging.ImageAttributes
$matrix = New-Object System.Drawing.Imaging.ColorMatrix
$matrix.Matrix33 = 0.5 # 50% opacity
$attr.SetColorMatrix($matrix)

$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$g.DrawImage($b00, $rect, 0, 0, $w, $h, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawImage($liana, $rect, 0, 0, $w, $h, [System.Drawing.GraphicsUnit]::Pixel, $attr)

$overlayPath = Join-Path $root 'scratch\liana_v2_b00_overlay.png'
$overlay.Save($overlayPath, [System.Drawing.Imaging.ImageFormat]::Png)

$overlay.Dispose(); $attr.Dispose(); $g.Dispose(); $b00.Dispose(); $liana.Dispose()
Write-Host "Overlay v2 saved to: $overlayPath"

