Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$imgPath = Join-Path $root "test\incoming\body_human\b00_master.png"
$bmp = [System.Drawing.Bitmap]::FromFile($imgPath)
$w = $bmp.Width
$h = $bmp.Height

Write-Host "New Dimensions: ${w}x${h}"

# 전체 영역 바운딩 박스 측정 (티끌 제거 확인)
$minX = $w; $maxX = 0; $minY = $h; $maxY = 0

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
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

Write-Host "Cleaned Bounding Box:"
Write-Host "  X: min=$minX, max=$maxX, width=$charWidth, center=$centerX"
Write-Host "  Y: head_top=$minY, feet_bottom=$maxY, height=$charHeight"

$bmp.Dispose()

