Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\char_liana\c00_complete.png'
$outDir = Join-Path $root 'test\incoming\char_liana'

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width; $h = $src.Height
$bgColor = [System.Drawing.Color]::FromArgb(255, 8, 239, 19)

function New-Chroma() {
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $b = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($b, 0, 0, $w, $h)
    $b.Dispose()
    $g.Dispose()
    return $bmp
}

# 1. c07_skirt_front.png 정밀 보정 (배/골반 맨살 노출 0% 차단)
# 흉갑 아랫단 Y=540부터 튜닉 밑단 Y=695까지 튜닉 흰색 천과 갈색 벨트를 100% 온전히 복사!
$c07 = New-Chroma
for ($y = 538; $y -le 698; $y++) {
    for ($x = 400; $x -le 610; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        # 남색 바지(Y > 640 부근)는 다리 파츠에 들어가므로 제외하되, 튜닉 흰색 천/벨트는 온전히 유지!
        $isNavyPants = ($y -gt 635 -and $p.B -gt 100 -and $p.B -gt $p.R + 25 -and $p.B -gt $p.G + 15)
        if ($isNavyPants) { continue }

        # 칼(X < 395) 및 방패(X > 600) 제외
        if ($x -lt 395 -or $x -gt 605) { continue }

        $c07.SetPixel($x, $y, $p)
    }
}
$c07.Save((Join-Path $outDir 'c07_skirt_front.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c07.Dispose()
Write-Host "Refined: c07_skirt_front.png"

# 2. c11_pants_near.png & c12_pants_far.png 정밀 보정 (바디 맨발가락 덮음)
# 가까운 다리: Y=630..960, X=370..515
$c11 = New-Chroma
for ($y = 630; $y -le 960; $y++) {
    for ($x = 370; $x -le 515; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        # 칼날(X < 395 및 Y > 650 금속) 제외
        $isSword = ($x -lt 395 -and [math]::Abs($p.R - $p.G) -lt 15 -and [math]::Abs($p.G - $p.B) -lt 15 -and $p.R -gt 140)
        if ($isSword) { continue }

        $c11.SetPixel($x, $y, $p)
    }
}
$c11.Save((Join-Path $outDir 'c11_pants_near.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c11.Dispose()
Write-Host "Refined: c11_pants_near.png"

# 먼 다리: Y=630..960, X=505..635
$c12 = New-Chroma
for ($y = 630; $y -le 960; $y++) {
    for ($x = 505; $x -le 635; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        # 칼집 끝자락 제외
        if ($x -gt 625) { continue }

        $c12.SetPixel($x, $y, $p)
    }
}
$c12.Save((Join-Path $outDir 'c12_pants_far.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c12.Dispose()
Write-Host "Refined: c12_pants_far.png"

$src.Dispose()
Write-Host "Costume parts refined successfully!"

