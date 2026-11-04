Add-Type -AssemblyName System.Drawing
$imgPath = Resolve-Path "test\incoming\body_human\b00_master.png"
$bmp = [System.Drawing.Bitmap]::FromFile($imgPath)
$w = $bmp.Width
$h = $bmp.Height

# 우측 하단 아티팩트 제외 (x < 1700 기준)
$minX = $w; $maxX = 0; $minY = $h; $maxY = 0

for ($y = 0; $y -lt $h; $y += 2) {
    for ($x = 0; $x -lt 1700; $x += 2) {
        $p = $bmp.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        if (-not $isGreen) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

$centerX = [math]::Round(($minX + $maxX) / 2)
$charWidth = $maxX - $minX
$charHeight = $maxY - $minY

Write-Host "Character Body Only Bounding Box (at ${w}x${h}):"
Write-Host "  X: min=$minX, max=$maxX, width=$charWidth, center=$centerX"
Write-Host "  Y: head_top=$minY, feet_bottom=$maxY, height=$charHeight"

$scale = 1024.0 / $w
$sMinX = [math]::Round($minX * $scale)
$sMaxX = [math]::Round($maxX * $scale)
$sMinY = [math]::Round($minY * $scale)
$sMaxY = [math]::Round($maxY * $scale)
$sCenterX = [math]::Round($centerX * $scale)
$sHeight = [math]::Round($charHeight * $scale)

Write-Host "`nEquivalent at 1024x1024:"
Write-Host "  X: min=$sMinX, max=$sMaxX, center=$sCenterX (Target: ~512)"
Write-Host "  Y: head_top=$sMinY (Target: ~180), feet_bottom=$sMaxY (Target: ~880), height=$sHeight (Target: ~700)"

$bmp.Dispose()

