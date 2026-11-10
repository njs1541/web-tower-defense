Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$outDir = Join-Path $root 'test\incoming\body_human'

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $srcBmp.Width
$h = $srcBmp.Height

# 크로마키 배경색: R=8, G=239, B=19
$bgColor = [System.Drawing.Color]::FromArgb(255, 8, 239, 19)
# 원본 피부 대표 색상들
$skinLight = [System.Drawing.Color]::FromArgb(255, 254, 224, 206)
$skinMid   = [System.Drawing.Color]::FromArgb(255, 246, 202, 182)
$skinNeck  = [System.Drawing.Color]::FromArgb(255, 230, 170, 152)
$lineColor = [System.Drawing.Color]::FromArgb(255, 55, 38, 36)

Write-Host "1. Analyzing pixel map and exact anatomical boundaries..."
$isChar = New-Object 'bool[,]' $w, $h
$lumMap = New-Object 'double[,]' $w, $h

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $srcBmp.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        $isChar[$x, $y] = (-not $isGreen)
        if (-not $isGreen) {
            $lumMap[$x, $y] = ($p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11)
        } else {
            $lumMap[$x, $y] = 999.0
        }
    }
}

$nearArmRight = New-Object 'int[]' $h
$torsoRight   = New-Object 'int[]' $h

for ($y = 440; $y -le 695; $y++) {
    # (A) Near Arm (화면 왼쪽 팔) 안쪽 경계 찾기
    if ($y -lt 475) {
        $nearArmRight[$y] = 450
    } elseif ($y -le 510) {
        # 겨드랑이 위(Y=475..510): X=455..478 사이의 어두운 안쪽 팔 라인 찾기
        $found = [math]::Round(476 - ($y - 475) * 0.35)
        for ($x = 478; $x -ge 455; $x--) {
            if ($lumMap[$x, $y] -lt 140) { $found = $x; break }
        }
        $nearArmRight[$y] = $found
    } else {
        # 겨드랑이 아래(Y > 510): Y > 645 구간은 손가락(엄지)이 400까지 있으므로 410으로 고정
        if ($y -gt 645) {
            $nearArmRight[$y] = 410
        } else {
            $armScanStart = [math]::Max(375, [math]::Round(430 - ($y - 510) * 0.42))
            $found = 435
            for ($x = $armScanStart; $x -le 472; $x++) {
                if (-not $isChar[$x, $y]) { $found = $x - 1; break }
            }
            $nearArmRight[$y] = $found
        }
    }

    # (B) Torso Right (상체 오른쪽 외곽선 = 먼 팔과의 경계) 찾기
    if ($y -lt 455) {
        $torsoRight[$y] = 590
    } elseif ($y -le 578) {
        $expected = if ($y -le 495) { 576 + ($y - 455) * 0.42 } elseif ($y -le 530) { 593 - ($y - 495) * 0.23 } else { 585 + ($y - 530) * 0.16 }
        $expInt = [math]::Round($expected)
        $bestX = $expInt
        $minLum = 999.0
        for ($x = $expInt - 5; $x -le $expInt + 5; $x++) {
            if ($lumMap[$x, $y] -lt $minLum) {
                $minLum = $lumMap[$x, $y]
                $bestX = $x
            }
        }
        $torsoRight[$y] = $bestX
    } else {
        $found = 606
        for ($x = 570; $x -le 620; $x++) {
            if (-not $isChar[$x, $y]) { $found = $x - 1; break }
        }
        $torsoRight[$y] = $found
    }
}

# (C) 턱선 하단 경계 (Chin bottom Y)
$chinBottomY = New-Object 'int[]' $w
for ($x = 365; $x -le 645; $x++) {
    if ($x -lt 490 -or $x -gt 545) {
        # 목 기둥(X: 490..545) 바깥쪽은 Y=406까지 있는 모든 픽셀이 순수 머리/귀/턱 끝임!
        $chinBottomY[$x] = 406
    } else {
        # 목 기둥과 겹치는 구간(X: 490..545): 밝은 얼굴 피부(lum >= 200) 최하단 + 턱 외곽선 두께(5px)
        $lastBrightFaceY = 390
        for ($y = 350; $y -le 404; $y++) {
            if ($isChar[$x, $y] -and $lumMap[$x, $y] -ge 200.0) {
                $lastBrightFaceY = $y
            }
        }
        $chinBottomY[$x] = $lastBrightFaceY + 5
    }
}

function New-ChromaCanvas() {
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $b = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($b, 0, 0, $w, $h)
    $b.Dispose()
    $g.Dispose()
    return $bmp
}

function Get-SegmentDist($px, $py, $x1, $y1, $x2, $y2) {
    $dx = $x2 - $x1
    $dy = $y2 - $y1
    $lenSq = $dx * $dx + $dy * $dy
    if ($lenSq -eq 0) { return @{ dist = [math]::Sqrt(($px-$x1)*($px-$x1) + ($py-$y1)*($py-$y1)); t = 0.0 } }
    $t = (($px - $x1) * $dx + ($py - $y1) * $dy) / $lenSq
    if ($t -lt 0.0) { $t = 0.0 }
    if ($t -gt 1.0) { $t = 1.0 }
    $projX = $x1 + $t * $dx
    $projY = $y1 + $t * $dy
    $dist = [math]::Sqrt(($px - $projX)*($px - $projX) + ($py - $projY)*($py - $projY))
    return @{ dist = $dist; t = $t; projX = $projX; projY = $projY }
}

# =========================================================================
# 1. b01_head_base.png (머리 소체: 목 기둥 수염 없이 깔끔한 턱선 분리)
# Pivot: (513, 390)
# =========================================================================
$b01 = New-ChromaCanvas
for ($y = 100; $y -le 406; $y++) {
    for ($x = 365; $x -le 645; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        if ($x -lt 502 -and $y -gt 394) { continue }
        if ($y -le $chinBottomY[$x]) {
            $b01.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
        }
    }
}
$b01.Save((Join-Path $outDir "b01_head_base.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b01.Dispose()
Write-Host "Created: b01_head_base.png"

# =========================================================================
# 2. b02_torso_upper.png (상체 + 목 기둥)
# Neck Pivot: (513, 390), Waist Pivot: (520, 620)
# =========================================================================
$b02 = New-ChromaCanvas

# (2-A) 머리 뒤에 가려진 목 기둥 상단 연장 (Y=375..415, 중심 X=513, 반폭 22px)
for ($y = 375; $y -le 415; $y++) {
    for ($x = 488; $x -le 538; $x++) {
        $dx = $x - 513.0
        $dy = if ($y -lt 390) { $y - 390.0 } else { 0.0 }
        $dist = [math]::Sqrt($dx * $dx + $dy * $dy)
        if ($dist -le 23.5) {
            if ($dist -ge 21.0) {
                $b02.SetPixel($x, $y, $lineColor)
            } else {
                $b02.SetPixel($x, $y, $skinNeck)
            }
        }
    }
}

# (2-B) 실제 상체 픽셀 복사 (양팔 완벽 제외, 허리 볼 조인트 마감)
for ($y = 395; $y -le 665; $y++) {
    for ($x = 435; $x -le 608; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        if ($y -le $chinBottomY[$x] -and ($x -lt 489 -or $x -gt 537)) { continue }

        # 왼쪽 가까운 팔(Near Arm) 영역 제외
        if ($y -ge 470 -and $x -le ($nearArmRight[$y] + 2)) { continue }

        # 오른쪽 먼 팔(Far Arm) 영역 제외
        if ($y -ge 455 -and $x -gt $torsoRight[$y]) { continue }

        # 하단 허리 곡선 마감: Y > 610 영역은 (521, 610) 중심 타원 내부만 포함
        if ($y -gt 610) {
            $dx = ($x - 521.0) / 83.0
            $dy = ($y - 610.0) / 48.0
            if (($dx * $dx + $dy * $dy) -gt 1.0) { continue }
        }

        $b02.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}

# (2-C) 가까운 팔(b04)에 가려진 왼쪽 어깨/겨드랑이 안쪽 살 채움
for ($y = 455; $y -le 520; $y++) {
    $leftLim = [math]::Round(454 + ($y - 455) * 0.28)
    $rightLim = $nearArmRight[$y] + 5
    for ($x = $leftLim; $x -le $rightLim; $x++) {
        if ($x -ge 452 -and $x -le 500) {
            if ($x -le $leftLim + 2) {
                $b02.SetPixel($x, $y, $lineColor)
            } else {
                $b02.SetPixel($x, $y, $skinLight)
            }
        }
    }
}

$b02.Save((Join-Path $outDir "b02_torso_upper.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b02.Dispose()
Write-Host "Created: b02_torso_upper.png"

# =========================================================================
# 3. b03_pelvis.png (골반)
# =========================================================================
$b03 = New-ChromaCanvas
for ($y = 600; $y -le 700; $y++) {
    for ($x = 435; $x -le 608; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        if ($y -lt 625) {
            $dx = ($x - 521.0) / 80.0
            $dy = ($y - 625.0) / 25.0
            if (($dx * $dx + $dy * $dy) -gt 1.0) { continue }
        }
        if ($y -gt 655) {
            $distFromCenter = [math]::Abs($x - 524.0)
            $maxY = 696.0 - ($distFromCenter * 0.48)
            if ($y -gt $maxY) { continue }
        }
        $b03.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b03.Save((Join-Path $outDir "b03_pelvis.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b03.Dispose()
Write-Host "Created: b03_pelvis.png"

# =========================================================================
# 4. b04_arm_near_upper.png (가까운 팔 위 - 화면 왼쪽 위팔)
# Shoulder Pivot: (451, 480) [R=23.5], Elbow Pivot: (415, 565) [R=24]
# =========================================================================
$b04 = New-ChromaCanvas
$shX = 451.0; $shY = 480.0; $shR = 23.5
$elX = 415.0; $elY = 565.0; $elR = 24.0

for ($y = 454; $y -le 592; $y++) {
    for ($x = 385; $x -le 478; $x++) {
        $seg = Get-SegmentDist $x $y $shX $shY $elX $elY
        $limitR = $shR + ($elR - $shR) * $seg.t

        if ($seg.dist -le $limitR) {
            if ($isChar[$x, $y] -and $x -le ($nearArmRight[$y] + 1)) {
                $b04.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
            } elseif ($seg.t -gt 0.82 -or $seg.t -lt 0.18) {
                if ($seg.dist -ge ($limitR - 2.2)) {
                    $b04.SetPixel($x, $y, $lineColor)
                } else {
                    $b04.SetPixel($x, $y, $skinLight)
                }
            }
        }
    }
}
$b04.Save((Join-Path $outDir "b04_arm_near_upper.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b04.Dispose()
Write-Host "Created: b04_arm_near_upper.png"

# =========================================================================
# 5. b05_arm_near_lower.png (가까운 팔 아래 - 화면 왼쪽 아래팔 & 손)
# Elbow Pivot: (415, 565) [R=24]
# =========================================================================
$b05 = New-ChromaCanvas
for ($y = 540; $y -le 690; $y++) {
    for ($x = 340; $x -le 442; $x++) {
        if ($y -lt 565) {
            $dx = $x - $elX
            $dy = $y - $elY
            $d = [math]::Sqrt($dx * $dx + $dy * $dy)
            if ($d -le $elR) {
                if ($isChar[$x, $y] -and $x -le $nearArmRight[$y]) {
                    $b05.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
                } else {
                    if ($d -ge ($elR - 2.2)) { $b05.SetPixel($x, $y, $lineColor) }
                    else { $b05.SetPixel($x, $y, $skinLight) }
                }
            }
        } else {
            if ($isChar[$x, $y] -and $x -le $nearArmRight[$y]) {
                $b05.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
            }
        }
    }
}
$b05.Save((Join-Path $outDir "b05_arm_near_lower.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b05.Dispose()
Write-Host "Created: b05_arm_near_lower.png"

# =========================================================================
# 6. b06_arm_far_upper.png (먼 팔 위 - 화면 오른쪽 위팔, 몸통 외곽선 자국 없이 깨끗하게 복원!)
# Shoulder Pivot: (575, 480) [R=22], Elbow Pivot: (612, 565) [R=23]
# =========================================================================
$b06 = New-ChromaCanvas
$fshX = 575.0; $fshY = 480.0; $fshR = 22.0
$felX = 612.0; $felY = 565.0; $felR = 23.0

for ($y = 455; $y -le 590; $y++) {
    for ($x = 550; $x -le 640; $x++) {
        $seg = Get-SegmentDist $x $y $fshX $fshY $felX $felY
        $limitR = $fshR + ($felR - $fshR) * $seg.t

        if ($seg.dist -le $limitR) {
            # 몸통 우측 외곽선($torsoRight[$y] + 2)보다 확실히 바깥쪽에 있는 실제 팔 픽셀만 원본 사용
            if ($isChar[$x, $y] -and $x -gt ($torsoRight[$y] + 2)) {
                $b06.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
            } else {
                # 몸통 뒤에 가려진 부분 또는 관절 캡: 몸통 외곽선 자국 없이 깨끗한 팔 피부와 외곽선으로 채움
                if ($seg.dist -ge ($limitR - 2.2)) {
                    $b06.SetPixel($x, $y, $lineColor)
                } else {
                    $b06.SetPixel($x, $y, $skinMid)
                }
            }
        }
    }
}
$b06.Save((Join-Path $outDir "b06_arm_far_upper.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b06.Dispose()
Write-Host "Created: b06_arm_far_upper.png"

# =========================================================================
# 7. b07_arm_far_lower.png (먼 팔 아래 - 화면 오른쪽 아래팔 & 손)
# Elbow Pivot: (612, 565) [R=23]
# =========================================================================
$b07 = New-ChromaCanvas
for ($y = 540; $y -le 685; $y++) {
    for ($x = 585; $x -le 685; $x++) {
        if ($y -lt 565) {
            $dx = $x - $felX
            $dy = $y - $felY
            $d = [math]::Sqrt($dx * $dx + $dy * $dy)
            if ($d -le $felR) {
                if ($isChar[$x, $y] -and $x -gt ($torsoRight[$y] + 2)) {
                    $b07.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
                } else {
                    if ($d -ge ($felR - 2.2)) { $b07.SetPixel($x, $y, $lineColor) }
                    else { $b07.SetPixel($x, $y, $skinMid) }
                }
            }
        } else {
            if ($isChar[$x, $y] -and $x -gt $torsoRight[$y]) {
                $b07.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
            }
        }
    }
}
$b07.Save((Join-Path $outDir "b07_arm_far_lower.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b07.Dispose()
Write-Host "Created: b07_arm_far_lower.png"

# =========================================================================
# 8. b08_leg_near.png (가까운 다리 - 화면 왼쪽 다리)
# Hip Pivot: (481, 680) [R=43]
# =========================================================================
$b08 = New-ChromaCanvas
$nHipX = 481.0; $nHipY = 680.0; $nHipR = 43.0

for ($y = 635; $y -le 968; $y++) {
    for ($x = 420; $x -le 526; $x++) {
        if ($y -lt 680) {
            $dx = $x - $nHipX
            $dy = $y - $nHipY
            $d = [math]::Sqrt($dx * $dx + $dy * $dy)
            if ($d -le $nHipR -and $isChar[$x, $y]) {
                $b08.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
            }
        } else {
            if ($isChar[$x, $y] -and $x -le 525) {
                $b08.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
            }
        }
    }
}
$b08.Save((Join-Path $outDir "b08_leg_near.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b08.Dispose()
Write-Host "Created: b08_leg_near.png"

# =========================================================================
# 9. b09_leg_far.png (먼 다리 - 화면 오른쪽 다리)
# Hip Pivot: (566, 680) [R=39]
# =========================================================================
$b09 = New-ChromaCanvas
$fHipX = 566.0; $fHipY = 680.0; $fHipR = 39.0

for ($y = 638; $y -le 960; $y++) {
    for ($x = 525; $x -le 632; $x++) {
        if ($y -lt 680) {
            $dx = $x - $fHipX
            $dy = $y - $fHipY
            $d = [math]::Sqrt($dx * $dx + $dy * $dy)
            if ($d -le $fHipR -and $isChar[$x, $y]) {
                $b09.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
            }
        } else {
            if ($isChar[$x, $y] -and $x -ge 526) {
                $b09.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
            }
        }
    }
}
$b09.Save((Join-Path $outDir "b09_leg_far.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b09.Dispose()
Write-Host "Created: b09_leg_far.png"

$srcBmp.Dispose()
Write-Host "All 9 body parts successfully rebuilt!"
