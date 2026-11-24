Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\NZIN\.gemini\antigravity\brain\a9b248b5-71cd-4fef-a353-af82a1fa0bb5\c00_complete_1795504871491.jpg"
$outPath = Join-Path (Get-Location).Path "test\incoming\char_liana\c00_complete.png"
$guidePath = Join-Path (Get-Location).Path "test\guide\guide_template.png"
$b00Path = Join-Path (Get-Location).Path "test\incoming\body_human\b00_master.png"
$overlayGuidePath = Join-Path (Get-Location).Path "scratch\c00_with_guide.png"
$overlayB00Path = Join-Path (Get-Location).Path "scratch\c00_with_b00.png"

$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $bmp.Width; $h = $bmp.Height

# 1. 원본 측정 (머리 꼭대기 top, 발바닥 foot, 몸통 중심 centerX)
$rows = New-Object int[] $h
for ($y = 0; $y -lt $h; $y++) {
    $c = 0
    for ($x = 0; $x -lt $w; $x++) {
        $p = $bmp.GetPixel($x, $y)
        if (-not ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)) { $c++ }
    }
    $rows[$y] = $c
}

$top = 0; while ($top -lt $h -and $rows[$top] -eq 0) { $top++ }
$foot = $h - 1; while ($foot -ge 0 -and $rows[$foot] -eq 0) { $foot-- }
$rawTotalH = $foot - $top + 1

# 몸통 중심 X 측정 (머리+상체 중심: x=330..650 범위 내 y=top+50..top+320)
$sumMidX = 0.0; $cntMidX = 0
for ($y = $top + 40; $y -lt ($top + 280); $y++) {
    $x0 = -1; $x1 = -1
    for ($x = 300; $x -lt 690; $x++) {
        $p = $bmp.GetPixel($x, $y)
        if (-not ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)) {
            if ($x0 -lt 0) { $x0 = $x }
            $x1 = $x
        }
    }
    if ($x0 -ge 0) {
        $sumMidX += ($x0 + $x1) / 2.0
        $cntMidX++
    }
}
$rawCenterX = $sumMidX / $cntMidX

# 2. 단일 균일 배율(Uniform Scale) 계산 — 머리와 몸을 절대 따로 늘리지 않음!
$dstTop = 180.0
$dstFoot = 880.0
$dstCenterX = 512.0
$uniformScale = ($dstFoot - $dstTop) / [double]($foot - $top)

Write-Host ("Raw c00: Size={0}x{1}, top={2}, foot={3}, totalH={4}, rawCenterX={5:F1}, uniformScale={6:F4}" -f $w, $h, $top, $foot, $rawTotalH, $rawCenterX, $uniformScale)

$dst = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$pureGreen = [System.Drawing.Color]::FromArgb(255, 0, 255, 0)
for ($dy = 0; $dy -lt 1024; $dy++) {
    for ($dx = 0; $dx -lt 1024; $dx++) {
        $dst.SetPixel($dx, $dy, $pureGreen)
    }
}

# 역방향 매핑 + Bilinear 보간 (X, Y 모두 동일한 $uniformScale 적용!)
for ($dy = 175; $dy -le 885; $dy++) {
    $sy = $top + ($dy - $dstTop) / $uniformScale
    if ($sy -lt 1 -or $sy -ge ($h - 2)) { continue }
    $iy = [Math]::Floor($sy)
    $fy = $sy - $iy

    for ($dx = 80; $dx -le 920; $dx++) {
        $sx = $rawCenterX + ($dx - $dstCenterX) / $uniformScale
        if ($sx -lt 1 -or $sx -ge ($w - 2)) { continue }
        $ix = [Math]::Floor($sx)
        $fx = $sx - $ix

        $rSum = 0.0; $gSum = 0.0; $bSum = 0.0; $wSum = 0.0
        for ($oy = 0; $oy -le 1; $oy++) {
            $wy = if ($oy -eq 0) { 1.0 - $fy } else { $fy }
            for ($ox = 0; $ox -le 1; $ox++) {
                $wx = if ($ox -eq 0) { 1.0 - $fx } else { $fx }
                $wt = $wx * $wy
                $p = $bmp.GetPixel($ix + $ox, $iy + $oy)
                $isBg = ($p.G -gt 145 -and $p.R -lt 125 -and $p.B -lt 125)
                if (-not $isBg) {
                    $pr = [double]$p.R; $pg = [double]$p.G; $pb = [double]$p.B
                    $maxRB = [Math]::Max($pr, $pb)
                    if ($pg -gt ($maxRB + 10)) { $pg = $maxRB }
                    $rSum += $pr * $wt; $gSum += $pg * $wt; $bSum += $pb * $wt
                    $wSum += $wt
                }
            }
        }

        if ($wSum -ge 0.45) {
            $rr = [int][Math]::Max(0, [Math]::Min(255, [Math]::Round($rSum / $wSum)))
            $gg = [int][Math]::Max(0, [Math]::Min(255, [Math]::Round($gSum / $wSum)))
            $bb = [int][Math]::Max(0, [Math]::Min(255, [Math]::Round($bSum / $wSum)))
            $dst.SetPixel($dx, $dy, [System.Drawing.Color]::FromArgb(255, $rr, $gg, $bb))
        }
    }
}

$dst.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

# 3. 가이드 겹침본 저장
if (Test-Path $guidePath) {
    $guide = [System.Drawing.Bitmap]::FromFile($guidePath)
    $ov = New-Object System.Drawing.Bitmap($dst)
    $g = [System.Drawing.Graphics]::FromImage($ov)
    $g.DrawImage($guide, 0, 0, 1024, 1024)
    $g.Dispose()
    $ov.Save($overlayGuidePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $ov.Dispose()
    $guide.Dispose()
}

# 4. b00 마네킹과 반투명 비교본 저장
if (Test-Path $b00Path) {
    $b00 = [System.Drawing.Bitmap]::FromFile($b00Path)
    $comp = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    for ($y = 0; $y -lt 1024; $y++) {
        for ($x = 0; $x -lt 1024; $x++) {
            $p1 = $b00.GetPixel($x, $y)
            $p2 = $dst.GetPixel($x, $y)
            $r = [int](($p1.R * 0.4) + ($p2.R * 0.6))
            $g = [int](($p1.G * 0.4) + ($p2.G * 0.6))
            $b = [int](($p1.B * 0.4) + ($p2.B * 0.6))
            $comp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $r, $g, $b))
        }
    }
    if (Test-Path $guidePath) {
        $guide = [System.Drawing.Bitmap]::FromFile($guidePath)
        $g = [System.Drawing.Graphics]::FromImage($comp)
        $g.DrawImage($guide, 0, 0, 1024, 1024)
        $g.Dispose()
        $guide.Dispose()
    }
    $comp.Save($overlayB00Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $comp.Dispose()
    $b00.Dispose()
}

# 5. 최종 정렬된 c00의 top, foot 측정
$outTop = -1; $outFoot = -1
for ($y = 0; $y -lt 1024; $y++) {
    for ($x = 0; $x -lt 1024; $x++) {
        $p = $dst.GetPixel($x, $y)
        if (-not ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)) {
            if ($outTop -lt 0) { $outTop = $y }
            $outFoot = $y
        }
    }
}
Write-Host ("Output c00_complete.png: top={0}, foot={1}, height={2}" -f $outTop, $outFoot, ($outFoot - $outTop + 1))

$dst.Dispose()
$bmp.Dispose()
