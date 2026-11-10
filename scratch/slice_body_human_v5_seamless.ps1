Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$outDir = Join-Path $root 'test\incoming\body_human'

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $srcBmp.Width
$h = $srcBmp.Height

# 크로마키 배경색: R=8, G=239, B=19
$bgColor = [System.Drawing.Color]::FromArgb(255, 8, 239, 19)

Write-Host "1. Analyzing original pixels for seamless texture-cloned joint caps..."
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

for ($y = 430; $y -le 695; $y++) {
    # (A) 화면 왼쪽 팔(Near Arm) 안쪽 경계
    if ($y -lt 470) {
        $nearArmRight[$y] = [math]::Round(438 + ($y - 450) * 1.8)
    } elseif ($y -le 510) {
        $found = [math]::Round(476 - ($y - 475) * 0.35)
        for ($x = 478; $x -ge 455; $x--) {
            if ($lumMap[$x, $y] -lt 140) { $found = $x; break }
        }
        $nearArmRight[$y] = $found
    } elseif ($y -le 645) {
        $armScanStart = [math]::Max(375, [math]::Round(430 - ($y - 510) * 0.42))
        $found = 435
        for ($x = $armScanStart; $x -le 472; $x++) {
            if (-not $isChar[$x, $y]) { $found = $x - 1; break }
        }
        $nearArmRight[$y] = $found
    } else {
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
# 1. b01_head_base.png (머리: 원본 두상 + 턱선 그대로)
# Pivot: (513, 395)
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
# 2. b02_torso_upper.png (상체)
# - 목 상단: 검은 테두리 없이 원본 목 단면(Y=412) 픽셀을 그대로 위로(피벗 513,395 반지름 21px 반원 캡) 클로닝 연장!
# - 왼쪽 어깨: 가까운 팔(b04)에 가려진 어깨 끝(451,480 반지름 22px)을 원본 어깨 피부 픽셀 클로닝으로 채움!
# - 허리 하단: 허리 피벗(520, 620)을 중심으로 반지름 84px의 둥근 원호 캡으로 30px 연장!
# =========================================================================
$b02 = New-ChromaCanvas

# (2-A) 목 상단 자연스러운 원본 클로닝 캡 (Y=376..406, 중심 513, 395, R=21)
for ($y = 376; $y -le 408; $y++) {
    for ($x = 490; $x -le 536; $x++) {
        $dx = $x - 513.0
        $dy = if ($y -lt 395) { $y - 395.0 } else { 0.0 }
        if (($dx * $dx + $dy * $dy) -le (21.5 * 21.5)) {
            # 실제 원본 목 단면(Y=412)의 같은 X위치 픽셀을 그대로 복사 (그라데이션 & 좌우 외곽선 100% 일치!)
            $sampleX = [math]::Max(490, [math]::Min(536, $x))
            $b02.SetPixel($x, $y, $srcBmp.GetPixel($sampleX, 412))
        }
    }
}

# (2-B) 가려진 왼쪽 어깨 볼(Near Shoulder 451, 480) 자연스러운 원본 피부 클로닝 채움
for ($y = 452; $y -le 506; $y++) {
    for ($x = 432; $x -le 482; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        $dx = $x - 456.0
        $dy = if ($y -gt 475) { $y - 475.0 } else { ($y - 475.0) * 0.7 }
        if ($x -ge 456 -or ($dx * $dx + $dy * $dy) -le (24.0 * 24.0)) {
            # 팔 안쪽 경계선(X=468..478)만 상체 피부(X=484)로 매끄럽게 덮고 나머지는 원본 피부 유지
            if ($x -ge ($nearArmRight[$y] - 5) -and $x -le ($nearArmRight[$y] + 3)) {
                $b02.SetPixel($x, $y, $srcBmp.GetPixel(484, $y))
            } else {
                $b02.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
            }
        }
    }
}

# (2-C) 원본 상체 픽셀 복사 (허리 피벗 520,620 기준 아래로 30px 둥근 캡 오버랩 포함)
for ($y = 400; $y -le 652; $y++) {
    for ($x = 435; $x -le 608; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        if ($y -le ($chinBottomY[$x] - 2) -and ($x -lt 490 -or $x -gt 536)) { continue }
        if ($y -ge 500 -and $x -le $nearArmRight[$y]) { continue }
        if ($y -ge 452 -and $y -lt 500 -and $x -le ($nearArmRight[$y] + 3)) { continue }
        if ($y -ge 455 -and $x -gt $torsoRight[$y]) { continue }

        # 허리 아래(Y > 620)는 피벗(520, 620) 중심의 둥근 캡(깊이 30px, Y=650까지)으로 마감
        if ($y -gt 620) {
            $normX = ($x - 521.0) / 85.0
            if ([math]::Abs($normX) -gt 1.0) { continue }
            $capBottomY = 620.0 + 30.0 * [math]::Sqrt(1.0 - $normX * $normX)
            if ($y -gt $capBottomY) { continue }
        }

        $b02.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b02.Save((Join-Path $outDir "b02_torso_upper.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b02.Dispose()
Write-Host "Created: b02_torso_upper.png"

# =========================================================================
# 3. b03_pelvis.png (골반)
# - 허리 상단: 피벗(520, 620) 위로 25px(Y=595까지) 둥근 캡 오버랩!
# - 고관절 하단: 양옆 골반을 깎지 않고 중앙 가랑이(525, 695)로 이어지는 둥근 아치 마감!
# =========================================================================
$b03 = New-ChromaCanvas
for ($y = 595; $y -le 698; $y++) {
    for ($x = 435; $x -le 608; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        if ($y -lt 620 -and $x -le $nearArmRight[$y]) { continue }
        if ($y -lt 620 -and $x -gt $torsoRight[$y]) { continue }

        # 상단 허리 둥근 캡 (Y=595..620)
        if ($y -lt 620) {
            $normX = ($x - 521.0) / 84.0
            if ([math]::Abs($normX) -gt 1.0) { continue }
            $capTopY = 620.0 - 25.0 * [math]::Sqrt(1.0 - $normX * $normX)
            if ($y -lt $capTopY) { continue }
        }

        # 하단 고관절 아치
        $normX2 = [math]::Min(1.0, [math]::Abs($x - 524.0) / 88.0)
        $bottomArchY = 668.0 + 27.0 * [math]::Cos($normX2 * [math]::PI * 0.5)
        if ($y -gt $bottomArchY) { continue }

        $b03.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b03.Save((Join-Path $outDir "b03_pelvis.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b03.Dispose()
Write-Host "Created: b03_pelvis.png"

# =========================================================================
# 4. b04_arm_near_upper.png (가까운 팔 위)
# - 어깨 피벗(451, 480) 상단 둥근 캡 & 팔꿈치 피벗(415, 565) 하단 반지름 25px 둥근 캡!
# =========================================================================
$b04 = New-ChromaCanvas
$shX = 451.0; $shY = 480.0; $shR = 24.0
$elX = 415.0; $elY = 565.0; $elR = 25.0

for ($y = 452; $y -le 592; $y++) {
    for ($x = 380; $x -le 478; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        $maxArmX = if ($y -ge 505 -and $y -le 516) { 463 } else { $nearArmRight[$y] }
        if ($x -gt $maxArmX) { continue }

        # 어깨 위쪽(Y < 480)은 어깨 피벗(451, 480) 기준 둥근 캡으로 마감하여 회전 시 모서리 돌출 방지
        if ($y -lt $shY) {
            $dx = $x - $shX; $dy = $y - $shY
            if (($dx * $dx + $dy * $dy) -gt ($shR * $shR)) { continue }
        }

        # 팔꿈치 아래쪽(Y > 565)은 팔꿈치 피벗(415, 565) 기준 반지름 25px 반원 캡으로 오버랩
        if ($y -gt $elY) {
            $dx = $x - $elX; $dy = $y - $elY
            if (($dx * $dx + $dy * $dy) -gt ($elR * $elR)) { continue }
        }

        $b04.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b04.Save((Join-Path $outDir "b04_arm_near_upper.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b04.Dispose()
Write-Host "Created: b04_arm_near_upper.png"

# =========================================================================
# 5. b05_arm_near_lower.png (가까운 팔 아래)
# - 팔꿈치 피벗(415, 565) 상단 반지름 25px 반원 캡 오버랩!
# =========================================================================
$b05 = New-ChromaCanvas
for ($y = 538; $y -le 690; $y++) {
    for ($x = 340; $x -le 445; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        if ($x -gt $nearArmRight[$y]) { continue }

        if ($y -lt $elY) {
            $dx = $x - $elX; $dy = $y - $elY
            if (($dx * $dx + $dy * $dy) -gt ($elR * $elR)) { continue }
        }

        $b05.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b05.Save((Join-Path $outDir "b05_arm_near_lower.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b05.Dispose()
Write-Host "Created: b05_arm_near_lower.png"

# =========================================================================
# 6. b06_arm_far_upper.png (먼 팔 위)
# - 어깨 피벗(580, 485) & 팔꿈치 피벗(612, 565) 반지름 24px 둥근 캡
# - 몸통 뒤에 가려진 팔 안쪽(약 20px)을 검은 테두리 없이 원본 팔 피부 픽셀로만 부드럽게 연장!
# =========================================================================
$b06 = New-ChromaCanvas
$fshX = 580.0; $fshY = 485.0; $fshR = 22.0
$felX = 612.0; $felY = 565.0; $felR = 24.0

for ($y = 460; $y -le 590; $y++) {
    # Y에 따른 팔 중심선 X 추정 (어깨 580 -> 팔꿈치 612)
    $t = [math]::Max(0.0, [math]::Min(1.0, ($y - $fshY) / ($felY - $fshY)))
    $centerArmX = $fshX + $t * ($felX - $fshX)
    $halfW = 21.0 + $t * 3.0

    for ($x = 556; $x -le 642; $x++) {
        # 어깨 위쪽 둥근 캡
        if ($y -lt $fshY) {
            $dx = $x - $fshX; $dy = $y - $fshY
            if (($dx * $dx + $dy * $dy) -gt ($fshR * $fshR)) { continue }
        }
        # 팔꿈치 아래쪽 둥근 캡
        if ($y -gt $felY) {
            $dx = $x - $felX; $dy = $y - $felY
            if (($dx * $dx + $dy * $dy) -gt ($felR * $felR)) { continue }
        }

        # 몸통 바깥쪽의 실제 원본 팔 픽셀
        if ($isChar[$x, $y] -and $x -gt ($torsoRight[$y] + 1)) {
            $b06.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
        } elseif ($x -ge ($centerArmX - $halfW) -and $x -le ($torsoRight[$y] + 1)) {
            # 몸통 뒤에 숨겨진 팔 안쪽 여백: 검은 선 없이 해당 행(Y)의 실제 팔 피부 픽셀($torsoRight[$y] + 4)을 그대로 복사!
            $sampleX = [math]::Min($w - 1, $torsoRight[$y] + 4)
            if (-not $isChar[$sampleX, $y]) { $sampleX = $torsoRight[$y] - 4 }
            if ($isChar[$sampleX, $y]) {
                $b06.SetPixel($x, $y, $srcBmp.GetPixel($sampleX, $y))
            }
        }
    }
}
$b06.Save((Join-Path $outDir "b06_arm_far_upper.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b06.Dispose()
Write-Host "Created: b06_arm_far_upper.png"

# =========================================================================
# 7. b07_arm_far_lower.png (먼 팔 아래)
# - 팔꿈치 피벗(612, 565) 상단 반지름 24px 반원 캡 오버랩!
# =========================================================================
$b07 = New-ChromaCanvas
for ($y = 540; $y -le 685; $y++) {
    for ($x = 585; $x -le 685; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        if ($y -le 578 -and $x -le ($torsoRight[$y] + 1)) { continue }
        if ($y -gt 578 -and $x -le 610) { continue }

        if ($y -lt $felY) {
            $dx = $x - $felX; $dy = $y - $felY
            if (($dx * $dx + $dy * $dy) -gt ($felR * $felR)) { continue }
        }

        $b07.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b07.Save((Join-Path $outDir "b07_arm_far_lower.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b07.Dispose()
Write-Host "Created: b07_arm_far_lower.png"

# =========================================================================
# 8. b08_leg_near.png (가까운 다리)
# - 고관절 피벗(481, 680) 상단 반지름 44px 반원 캡 오버랩!
# =========================================================================
$b08 = New-ChromaCanvas
$nHipX = 481.0; $nHipY = 680.0; $nHipR = 44.0

for ($y = 636; $y -le 968; $y++) {
    for ($x = 420; $x -le 525; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        if ($y -lt $nHipY) {
            $dx = $x - $nHipX; $dy = $y - $nHipY
            if (($dx * $dx + $dy * $dy) -gt ($nHipR * $nHipR)) { continue }
        }
        $b08.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b08.Save((Join-Path $outDir "b08_leg_near.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b08.Dispose()
Write-Host "Created: b08_leg_near.png"

# =========================================================================
# 9. b09_leg_far.png (먼 다리)
# - 고관절 피벗(566, 680) 상단 반지름 40px 반원 캡 오버랩!
# =========================================================================
$b09 = New-ChromaCanvas
$fHipX = 566.0; $fHipY = 680.0; $fHipR = 40.0

for ($y = 640; $y -le 960; $y++) {
    for ($x = 526; $x -le 632; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        if ($y -lt $fHipY) {
            $dx = $x - $fHipX; $dy = $y - $fHipY
            if (($dx * $dx + $dy * $dy) -gt ($fHipR * $fHipR)) { continue }
        }
        $b09.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b09.Save((Join-Path $outDir "b09_leg_far.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b09.Dispose()
Write-Host "Created: b09_leg_far.png"

$srcBmp.Dispose()
Write-Host "All 9 parts generated with seamless rounded caps & hidden area cloning!"
