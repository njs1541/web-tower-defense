Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$outDir = Join-Path $root 'test\incoming\body_human'

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $srcBmp.Width
$h = $srcBmp.Height

# 크로마키 배경색: R=8, G=239, B=19
$bgColor = [System.Drawing.Color]::FromArgb(255, 8, 239, 19)

Write-Host "1. Reading original pixels (100% pure original art preservation mode)..."
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

# 2. 원본 그림 속 실제 경계선(외곽선) 좌표 테이블
# - nearArmRight[y]: 화면 왼쪽 팔(b04/b05)과 몸통(b02) 사이의 실제 경계 X
# - torsoRight[y]: 몸통(b02)과 화면 오른쪽 팔(b06/b07) 사이의 실제 경계 X
$nearArmRight = New-Object 'int[]' $h
$torsoRight   = New-Object 'int[]' $h

for ($y = 430; $y -le 695; $y++) {
    # (A) 화면 왼쪽 팔(Near Arm) 안쪽 경계
    if ($y -lt 470) {
        # 어깨 위쪽 곡선: 팔이 시작되는 외곽선 안쪽
        $nearArmRight[$y] = [math]::Round(438 + ($y - 450) * 1.8)
    } elseif ($y -le 510) {
        # Y=470..510: 몸통 앞에 그려진 팔 안쪽 라인(X=475 -> 463) 추적
        $found = [math]::Round(476 - ($y - 475) * 0.35)
        for ($x = 478; $x -ge 455; $x--) {
            if ($lumMap[$x, $y] -lt 140) { $found = $x; break }
        }
        $nearArmRight[$y] = $found
    } elseif ($y -le 645) {
        # Y=511..645: 겨드랑이 아래 녹색 틈새 기준
        $armScanStart = [math]::Max(375, [math]::Round(430 - ($y - 510) * 0.42))
        $found = 435
        for ($x = $armScanStart; $x -le 472; $x++) {
            if (-not $isChar[$x, $y]) { $found = $x - 1; break }
        }
        $nearArmRight[$y] = $found
    } else {
        # 손가락(엄지 포함) 영역
        $nearArmRight[$y] = 410
    }

    # (B) 상체 우측 외곽선 (먼 팔과의 실제 경계선)
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
        $chinBottomY[$x] = 406
    } else {
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

# =========================================================================
# 모든 파츠는 인위적인 도형/색칠 없이 오직 $srcBmp.GetPixel($x, $y) 원본만 사용!
# =========================================================================

# 1. b01_head_base.png (머리: 원본 두상 + 턱선 그대로)
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
Write-Host "Created: b01_head_base.png (100% pure original pixels)"

# 2. b02_torso_upper.png (상체: 목 ~ 허리, 원본 외곽선 100% 보존)
# 허리 경계: Y=625 기준 부드러운 아래쪽 호(Arc)로 Y=642까지 원본 픽셀 공유
$b02 = New-ChromaCanvas
for ($y = 395; $y -le 645; $y++) {
    for ($x = 435; $x -le 608; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        # 턱선 위쪽 얼굴 픽셀 제외 (단, 턱선과 맞닿는 목 상단 Y >= 396, X: 490..540은 포함하여 틈 방지)
        if ($y -le ($chinBottomY[$x] - 2)) { continue }

        # 왼쪽 팔(Near Arm) 영역 제외
        if ($y -ge 458 -and $x -le $nearArmRight[$y]) { continue }

        # 오른쪽 먼 팔(Far Arm) 바깥 영역 제외
        if ($y -ge 455 -and $x -gt $torsoRight[$y]) { continue }

        # 하단 허리 곡선 (몸통 양옆 외곽선은 깎지 않고, Y=625 아래로 부드러운 둥근 호로 마감)
        $waistCurveY = 625.0 + 18.0 * [math]::Max(0.0, 1.0 - [math]::Pow(($x - 521.0) / 88.0, 2))
        if ($y -gt $waistCurveY) { continue }

        $b02.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b02.Save((Join-Path $outDir "b02_torso_upper.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b02.Dispose()
Write-Host "Created: b02_torso_upper.png (100% pure original pixels)"

# 3. b03_pelvis.png (골반: 허리 ~ 고관절, 원본 골반 라인 보존)
# 상단은 Y=610부터 시작하여 상체(b02)와 부드럽게 겹치고, 하단은 실제 가랑이/골반 주름선(Y=650..695)을 따라 부드러운 아치로 마감
$b03 = New-ChromaCanvas
for ($y = 608; $y -le 698; $y++) {
    for ($x = 435; $x -le 608; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        # 상단 허리 호 (몸통 양옆 외곽선 훼손 없이 Y=608..625 연결)
        $topCurveY = 625.0 - 16.0 * [math]::Max(0.0, 1.0 - [math]::Pow(($x - 521.0) / 88.0, 2))
        if ($y -lt $topCurveY) { continue }

        # 하단 고관절 경계: 양옆 골반 외곽선(Y=668)까지 살리고 중앙 가랑이(525, 695)로 이어지는 부드러운 코사인 아치
        $normX = [math]::Min(1.0, [math]::Abs($x - 524.0) / 88.0)
        $bottomArchY = 668.0 + 27.0 * [math]::Cos($normX * [math]::PI * 0.5)
        if ($y -gt $bottomArchY) { continue }

        $b03.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b03.Save((Join-Path $outDir "b03_pelvis.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b03.Dispose()
Write-Host "Created: b03_pelvis.png (100% pure original pixels)"

# 4. b04_arm_near_upper.png (가까운 팔 위: 원본 팔 외곽선 100% 보존 + 팔꿈치 둥근 호 분할)
# Shoulder Pivot: (451, 480), Elbow Pivot: (415, 565)
$b04 = New-ChromaCanvas
$elX = 415.0; $elY = 565.0; $elR = 25.0

for ($y = 450; $y -le 590; $y++) {
    for ($x = 380; $x -le 478; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        $maxArmX = if ($y -ge 505 -and $y -le 516) { 463 } else { $nearArmRight[$y] }
        if ($x -gt $maxArmX) { continue }

        # 팔꿈치 아래(Y > 565)는 (415, 565) 중심 반원 내부의 원본 픽셀만 포함
        if ($y -gt $elY) {
            $dx = $x - $elX
            $dy = $y - $elY
            if (($dx * $dx + $dy * $dy) -gt ($elR * $elR)) { continue }
        }

        $b04.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b04.Save((Join-Path $outDir "b04_arm_near_upper.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b04.Dispose()
Write-Host "Created: b04_arm_near_upper.png (100% pure original pixels)"

# 5. b05_arm_near_lower.png (가까운 팔 아래: 원본 아래팔 & 손 100% 보존 + 팔꿈치 상단 반원 오버랩)
# Elbow Pivot: (415, 565)
$b05 = New-ChromaCanvas
for ($y = 540; $y -le 690; $y++) {
    for ($x = 340; $x -le 445; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        if ($x -gt $nearArmRight[$y]) { continue }

        # 팔꿈치 위(Y < 565)는 (415, 565) 중심 반원 내부의 원본 픽셀만 포함
        if ($y -lt $elY) {
            $dx = $x - $elX
            $dy = $y - $elY
            if (($dx * $dx + $dy * $dy) -gt ($elR * $elR)) { continue }
        }

        $b05.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b05.Save((Join-Path $outDir "b05_arm_near_lower.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b05.Dispose()
Write-Host "Created: b05_arm_near_lower.png (100% pure original pixels)"

# 6. b06_arm_far_upper.png (먼 팔 위: 인위적 캡슐 덧칠 제거, 원본 픽셀 + 몸통 경계 안쪽 자연스러운 오버랩만 사용)
# Shoulder Pivot: (582, 485), Elbow Pivot: (612, 565)
$b06 = New-ChromaCanvas
$felX = 612.0; $felY = 565.0; $felR = 24.0

for ($y = 455; $y -le 590; $y++) {
    for ($x = 570; $x -le 642; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        # 몸통 우측 외곽선 안쪽으로 8px까지만 원본 피부 픽셀을 가져와 틈새를 막고, 과도한 인공 도형은 생성하지 않음
        $innerLimit = $torsoRight[$y] - 8
        if ($x -lt $innerLimit) { continue }
        # 몸통의 검은 우측 외곽선($torsoRight[$y] 부근 어두운 픽셀)은 팔 내부에 검은 줄로 보이지 않도록 건너뛰거나 바로 옆 원본 피부 픽셀로 대체
        if ($y -le 576 -and [math]::Abs($x - $torsoRight[$y]) -le 2 -and $lumMap[$x, $y] -lt 150) {
            $sampleX = [math]::Min($w - 1, $torsoRight[$y] + 4)
            if ($isChar[$sampleX, $y]) {
                $b06.SetPixel($x, $y, $srcBmp.GetPixel($sampleX, $y))
            }
            continue
        }

        # 팔꿈치 아래(Y > 565)는 (612, 565) 중심 반원 내부의 원본 픽셀만 포함
        if ($y -gt $felY) {
            $dx = $x - $felX
            $dy = $y - $felY
            if (($dx * $dx + $dy * $dy) -gt ($felR * $felR)) { continue }
        }

        $b06.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b06.Save((Join-Path $outDir "b06_arm_far_upper.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b06.Dispose()
Write-Host "Created: b06_arm_far_upper.png (100% pure original pixels)"

# 7. b07_arm_far_lower.png (먼 팔 아래: 원본 아래팔 & 손 100% 보존 + 팔꿈치 반원 오버랩)
# Elbow Pivot: (612, 565)
$b07 = New-ChromaCanvas
for ($y = 540; $y -le 685; $y++) {
    for ($x = 585; $x -le 685; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        if ($y -le 578 -and $x -le $torsoRight[$y]) { continue }
        if ($y -gt 578 -and $x -le 610) { continue }

        # 팔꿈치 위(Y < 565)는 (612, 565) 중심 반원 내부의 원본 픽셀만 포함
        if ($y -lt $felY) {
            $dx = $x - $felX
            $dy = $y - $felY
            if (($dx * $dx + $dy * $dy) -gt ($felR * $felR)) { continue }
        }

        $b07.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b07.Save((Join-Path $outDir "b07_arm_far_lower.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b07.Dispose()
Write-Host "Created: b07_arm_far_lower.png (100% pure original pixels)"

# 8. b08_leg_near.png (가까운 다리: 원본 다리 100% 보존 + 고관절 상단 반원 오버랩)
# Hip Pivot: (481, 680)
$b08 = New-ChromaCanvas
$nHipX = 481.0; $nHipY = 680.0; $nHipR = 44.0

for ($y = 636; $y -le 968; $y++) {
    for ($x = 420; $x -le 525; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        if ($y -lt $nHipY) {
            $dx = $x - $nHipX
            $dy = $y - $nHipY
            if (($dx * $dx + $dy * $dy) -gt ($nHipR * $nHipR)) { continue }
        }
        $b08.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b08.Save((Join-Path $outDir "b08_leg_near.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b08.Dispose()
Write-Host "Created: b08_leg_near.png (100% pure original pixels)"

# 9. b09_leg_far.png (먼 다리: 원본 다리 100% 보존 + 고관절 상단 반원 오버랩)
# Hip Pivot: (566, 680)
$b09 = New-ChromaCanvas
$fHipX = 566.0; $fHipY = 680.0; $fHipR = 40.0

for ($y = 640; $y -le 960; $y++) {
    for ($x = 526; $x -le 632; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        if ($y -lt $fHipY) {
            $dx = $x - $fHipX
            $dy = $y - $fHipY
            if (($dx * $dx + $dy * $dy) -gt ($fHipR * $fHipR)) { continue }
        }
        $b09.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b09.Save((Join-Path $outDir "b09_leg_far.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b09.Dispose()
Write-Host "Created: b09_leg_far.png (100% pure original pixels)"

$srcBmp.Dispose()
Write-Host "All 9 parts generated with ZERO artificial drawing or shape distortion!"
