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

# 1. c07_skirt_front.png (튜닉 앞자락 및 갈색 허리 벨트)
# Y: 550..698, X: 400..610
$c07 = New-Chroma
for ($y = 550; $y -le 698; $y++) {
    for ($x = 400; $x -le 610; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        # 남색 바지(R < 80, G < 90, B > 100)는 제외
        $isNavyPants = ($p.B -gt $p.R + 25 -and $p.B -gt $p.G + 15 -and $y -gt 630)
        if ($isNavyPants) { continue }

        # 칼(X < 400) 및 방패(X > 600) 제외
        # 손가락 피부(R > 230, G > 180) 제외
        $isSkin = ($p.R -gt 220 -and $p.G -gt 170 -and $p.B -gt 150 -and ($p.R - $p.G) -lt 45)
        if ($isSkin) { continue }

        $c07.SetPixel($x, $y, $p)
    }
}
$c07.Save((Join-Path $outDir 'c07_skirt_front.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c07.Dispose()
Write-Host "Created: c07_skirt_front.png"

# 2. c09_sleeve_near.png (가까운 소매: 오른팔 위 롤업 소매)
# Y: 400..585, X: 345..470
$c09 = New-Chroma
for ($y = 400; $y -le 585; $y++) {
    for ($x = 345; $x -le 470; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        # 피부색(아래팔) 제외: Y > 510 구간의 팔 피부
        $isSkin = ($p.R -gt 220 -and $p.G -gt 170 -and $p.B -gt 150 -and ($p.R - $p.G) -lt 45)
        if ($y -gt 510 -and $isSkin) { continue }

        # 은색 흉갑(X > 430, Y < 550에서 금속 광택) 제외
        # 소매는 흰색/아이보리 천 (R: 210..245, G: 200..235, B: 180..215)
        if ($x -gt 438 -and $y -lt 550) { continue }

        $c09.SetPixel($x, $y, $p)
    }
}
$c09.Save((Join-Path $outDir 'c09_sleeve_near.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c09.Dispose()
Write-Host "Created: c09_sleeve_near.png"

# 3. c10_sleeve_far.png (먼 소매: 왼팔 위 롤업 소매)
# Y: 400..560, X: 540..635
$c10 = New-Chroma
for ($y = 400; $y -le 560; $y++) {
    for ($x = 540; $x -le 635; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        # 방패(X > 590) 제외
        if ($x -gt 592) { continue }
        # 흉갑 본체(X < 575) 제외
        if ($x -lt 570) { continue }

        $c10.SetPixel($x, $y, $p)
    }
}
$c10.Save((Join-Path $outDir 'c10_sleeve_far.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c10.Dispose()
Write-Host "Created: c10_sleeve_far.png"

# 4. c11_pants_near.png (가까운 다리: 남색 바지 + 갈색 부츠)
# Y: 630..950, X: 370..515
$c11 = New-Chroma
for ($y = 630; $y -le 950; $y++) {
    for ($x = 370; $x -le 515; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        # 칼날(X < 390 및 Y > 650에서 회색/흰색 금속: R>150, G>150, B>150, R≈G≈B) 제외
        $isSword = ($x -lt 395 -and [math]::Abs($p.R - $p.G) -lt 15 -and [math]::Abs($p.G - $p.B) -lt 15)
        if ($isSword) { continue }

        # 튜닉 앞자락(Y < 685에서 흰색 튜닉: R>220, G>210, B>195) 제외
        $isTunic = ($y -lt 685 -and $p.R -gt 215 -and $p.G -gt 205 -and $p.B -gt 190)
        if ($isTunic) { continue }

        $c11.SetPixel($x, $y, $p)
    }
}
$c11.Save((Join-Path $outDir 'c11_pants_near.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c11.Dispose()
Write-Host "Created: c11_pants_near.png"

# 5. c12_pants_far.png (먼 다리: 남색 바지 + 갈색 부츠)
# Y: 630..940, X: 505..635
$c12 = New-Chroma
for ($y = 630; $y -le 940; $y++) {
    for ($x = 505; $x -le 635; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        # 칼집 끝자락(X > 600 부근 갈색 튜브) 제외
        if ($x -gt 625) { continue }
        # 튜닉 앞자락(Y < 685 흰색) 제외
        $isTunic = ($y -lt 685 -and $p.R -gt 215 -and $p.G -gt 205 -and $p.B -gt 190)
        if ($isTunic) { continue }

        $c12.SetPixel($x, $y, $p)
    }
}
$c12.Save((Join-Path $outDir 'c12_pants_far.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c12.Dispose()
Write-Host "Created: c12_pants_far.png"

# 6. c08_skirt_back.png (튜닉 뒷자락: 다리 뒤로 보이는 밑단)
# Y: 640..698, X: 410..590
$c08 = New-Chroma
for ($y = 640; $y -le 698; $y++) {
    for ($x = 410; $x -le 590; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        # 튜닉 흰색/아이보리 천만 채움
        $isTunic = ($p.R -gt 200 -and $p.G -gt 190 -and $p.B -gt 175)
        if ($isTunic) {
            $c08.SetPixel($x, $y, $p)
        }
    }
}
$c08.Save((Join-Path $outDir 'c08_skirt_back.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c08.Dispose()
Write-Host "Created: c08_skirt_back.png"

$src.Dispose()
Write-Host "Costume parts generated successfully!"

