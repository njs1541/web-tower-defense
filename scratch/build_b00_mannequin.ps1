Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\NZIN\.gemini\antigravity\brain\a9b248b5-71cd-4fef-a353-af82a1fa0bb5\chibi_mannequin_base_final_1795502584867.jpg"
$outPath = Join-Path (Get-Location).Path "test\incoming\body_human\b00_master.png"
$guidePath = Join-Path (Get-Location).Path "test\guide\guide_template.png"
$overlayPath = Join-Path (Get-Location).Path "scratch\b00_with_guide.png"

$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $bmp.Width
$h = $bmp.Height

# 1. 원본 측정
$rows = New-Object int[] $h
$minX = $w; $maxX = 0
for ($y = 0; $y -lt $h; $y++) {
    $c = 0
    for ($x = 0; $x -lt $w; $x++) {
        $p = $bmp.GetPixel($x, $y)
        $isBg = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if (-not $isBg) {
            $c++
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
        }
    }
    $rows[$y] = $c
}

$top = 0
while ($top -lt $h -and $rows[$top] -eq 0) { $top++ }
$foot = $h - 1
while ($foot -ge 0 -and $rows[$foot] -eq 0) { $foot-- }

$neck = -1; $minW = 999999
for ($y = $top + 150; $y -lt [Math]::Min($top + 480, $foot); $y++) {
    if ($rows[$y] -gt 0 -and $rows[$y] -lt $minW) {
        $minW = $rows[$y]
        $neck = $y
    }
}
$chin = $neck
while ($chin -gt $top -and $rows[$chin - 1] -le ($minW * 1.3)) { $chin-- }
$chin--

$rawHeadH = $chin - $top
$rawTotalH = $foot - $top + 1
$rawBodyH = $foot - $chin
$rawRatio = [Math]::Round($rawTotalH / $rawHeadH, 2)

# 몸통 중심 X 측정 (목 아래 ~ 골반 구간)
$sumMidX = 0; $cntMidX = 0
for ($y = $neck + 40; $y -lt $neck + 260; $y++) {
    $x0 = -1; $x1 = -1
    for ($x = 0; $x -lt $w; $x++) {
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

Write-Host ("Raw Measurements: Size={0}x{1}, top={2}, chin={3}, neck={4} (minW={5}), foot={6}, headH={7}, totalH={8}, ratio={9}, centerX={10:F1}" -f $w, $h, $top, $chin, $neck, $minW, $foot, $rawHeadH, $rawTotalH, $rawRatio, $rawCenterX)

# 2. 목표 기준선 (ASSET_SPEC v2.1: 머리 꼭대기 180, 턱 460, 발바닥 880, 중심 512)
$dstTop = 180.0
$dstChin = 460.0
$dstFoot = 880.0
$dstCenterX = 512.0

$scaleHeadY = ($dstChin - $dstTop) / [double]$rawHeadH
$scaleBodyY = ($dstFoot - $dstChin) / [double]$rawBodyH
$scaleX = (($dstFoot - $dstTop) / [double]$rawTotalH)

Write-Host ("Transform Scales: scaleHeadY={0:F4}, scaleBodyY={1:F4}, scaleX={2:F4}" -f $scaleHeadY, $scaleBodyY, $scaleX)

$dst = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$pureGreen = [System.Drawing.Color]::FromArgb(255, 0, 255, 0)

for ($dy = 0; $dy -lt 1024; $dy++) {
    for ($dx = 0; $dx -lt 1024; $dx++) {
        $dst.SetPixel($dx, $dy, $pureGreen)
    }
}

# 역방향 매핑 + Bilinear 보간 (배경 혼합 방지)
for ($dy = 175; $dy -le 885; $dy++) {
    if ($dy -le $dstChin) {
        # 목-턱 경계에서 부드러운 전환
        $sy = $top + ($dy - $dstTop) / $scaleHeadY
    } else {
        $sy = $chin + ($dy - $dstChin) / $scaleBodyY
    }
    if ($sy -lt $top -or $sy -gt $foot) { continue }

    $iy = [Math]::Floor($sy)
    $fy = $sy - $iy

    for ($dx = 150; $dx -le 870; $dx++) {
        $sx = $rawCenterX + ($dx - $dstCenterX) / $scaleX
        if ($sx -lt 1 -or $sx -ge ($w - 2)) { continue }

        $ix = [Math]::Floor($sx)
        $fx = $sx - $ix

        # 2x2 이웃 픽셀 중 전경 픽셀만 가중 평균
        $rSum = 0.0; $gSum = 0.0; $bSum = 0.0; $wSum = 0.0; $bgW = 0.0
        for ($oy = 0; $oy -le 1; $oy++) {
            $wy = if ($oy -eq 0) { 1.0 - $fy } else { $fy }
            for ($ox = 0; $ox -le 1; $ox++) {
                $wx = if ($ox -eq 0) { 1.0 - $fx } else { $fx }
                $wt = $wx * $wy
                $p = $bmp.GetPixel($ix + $ox, $iy + $oy)
                $isBg = ($p.G -gt 145 -and $p.R -lt 125 -and $p.B -lt 125)
                if ($isBg) {
                    $bgW += $wt
                } else {
                    # JPG 압축으로 인한 외곽 초록 번짐(G 과다) 제거
                    $pr = [double]$p.R
                    $pg = [double]$p.G
                    $pb = [double]$p.B
                    $maxRB = [Math]::Max($pr, $pb)
                    if ($pg -gt ($maxRB + 10)) {
                        $pg = $maxRB
                    }
                    $rSum += $pr * $wt
                    $gSum += $pg * $wt
                    $bSum += $pb * $wt
                    $wSum += $wt
                }
            }
        }

        if ($wSum -ge 0.45) {
            $rr = [int][Math]::Round($rSum / $wSum)
            $gg = [int][Math]::Round($gSum / $wSum)
            $bb = [int][Math]::Round($bSum / $wSum)
            $rr = [Math]::Max(0, [Math]::Min(255, $rr))
            $gg = [Math]::Max(0, [Math]::Min(255, $gg))
            $bb = [Math]::Max(0, [Math]::Min(255, $bb))
            $dst.SetPixel($dx, $dy, [System.Drawing.Color]::FromArgb(255, $rr, $gg, $bb))
        }
    }
}

$dst.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

# 3. 가이드 템플릿과 겹친 검수용 이미지 저장
if (Test-Path $guidePath) {
    $guide = [System.Drawing.Bitmap]::FromFile($guidePath)
    $ov = New-Object System.Drawing.Bitmap($dst)
    $g = [System.Drawing.Graphics]::FromImage($ov)
    $g.DrawImage($guide, 0, 0, 1024, 1024)
    $g.Dispose()
    $ov.Save($overlayPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $ov.Dispose()
    $guide.Dispose()
    Write-Host "Saved guide overlay to $overlayPath"
}

$dst.Dispose()
$bmp.Dispose()
Write-Host "Successfully saved new b00_master.png to $outPath"
