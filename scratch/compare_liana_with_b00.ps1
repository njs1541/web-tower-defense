Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$b00Path = Join-Path $root 'test\incoming\body_human\b00_master.png'
$lianaPath = 'C:\Users\NZIN\.gemini\antigravity\brain\a9b248b5-71cd-4fef-a353-af82a1fa0bb5\liana_sd_complete_1794294467056.jpg'

$b00 = [System.Drawing.Bitmap]::FromFile($b00Path)
$liana = [System.Drawing.Bitmap]::FromFile($lianaPath)

$w = $b00.Width; $h = $b00.Height

function Get-Landmarks($bmp, $name) {
    $minY = 9999; $maxY = 0; $minX = 9999; $maxX = 0
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $p = $bmp.GetPixel($x, $y)
            $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
            if (-not $isGreen) {
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
            }
        }
    }
    Write-Host ("[{0}] Head Top Y={1}, Feet Bottom Y={2}, Total Height={3}, Width={4}..{5}" -f $name, $minY, $maxY, ($maxY - $minY), $minX, $maxX)
}

Get-Landmarks $b00 "b00_master"
Get-Landmarks $liana "liana_sd_complete"

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

$overlayPath = Join-Path $root 'scratch\liana_b00_overlay.png'
$overlay.Save($overlayPath, [System.Drawing.Imaging.ImageFormat]::Png)

$overlay.Dispose(); $attr.Dispose(); $g.Dispose(); $b00.Dispose(); $liana.Dispose()
Write-Host "Overlay saved to: $overlayPath"

