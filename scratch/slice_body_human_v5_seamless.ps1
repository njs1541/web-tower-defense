Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$outDir = Join-Path $root 'test\incoming\body_human'

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $srcBmp.Width
$h = $srcBmp.Height

# 크로마키 배경색: R=8, G=239, B=19
$bgColor = [System.Drawing.Color]::FromArgb(255, 8, 239, 19)

Write-Host "1. Analyzing original pixels..."
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

# (A) 상체 좌측 외곽선 torsoLeft (Y=370..650 전체 정의)
$torsoLeft = New-Object 'int[]' $h
for ($y = 370; $y -le 650; $y++) {
    if ($y -lt 415) {
        # 목 왼쪽 외곽선
        $torsoLeft[$y] = 484
    } elseif ($y -lt 440) {
        # 목에서 쇄골로 벌어지는 구간 (415: 484 -> 440: 446)
        $t = ($y - 415.0) / (440.0 - 415.0)
        $torsoLeft[$y] = [math]::Round(484.0 * (1.0 - $t) + 446.0 * $t)
    } elseif ($y -le 458) {
        # 어깨 꼭대기
        $torsoLeft[$y] = 446
    } elseif ($y -le 508) {
        # 어깨 소켓(446)에서 겨드랑이 밑(463)으로 이어지는 완만한 곡선
        $t = ($y - 458.0) / (508.0 - 458.0)
        $torsoLeft[$y] = [math]::Round(446.0 * (1.0 - $t) + 463.0 * $t)
    } else {
        # 상체 중심(X=500)에서 왼쪽으로 스캔하여 원본 캐릭터 실루엣 외곽선 검출
        $found = 466
        for ($x = 500; $x -ge 430; $x--) {
            if (-not $isChar[$x, $y]) { $found = $x + 1; break }
        }
        $torsoLeft[$y] = $found
    }
}

# (B) 상체 우측 외곽선 torsoRight (Y=370..650 전체 정의: 0으로 남는 버그 완전 박멸!)
$torsoRight = New-Object 'int[]' $h
for ($y = 370; $y -le 650; $y++) {
    if ($y -lt 415) {
        # 목 오른쪽 외곽선
        $torsoRight[$y] = 534
    } elseif ($y -lt 440) {
        # 목에서 오른쪽 쇄골로 벌어지는 구간 (415: 534 -> 440: 585)
        $t = ($y - 415.0) / (440.0 - 415.0)
        $torsoRight[$y] = [math]::Round(534.0 * (1.0 - $t) + 585.0 * $t)
    } elseif ($y -lt 455) {
        $torsoRight[$y] = [math]::Round(585 + ($y - 440) * 0.4)
    } elseif ($y -le 578) {
        $expected = if ($y -le 495) { 591 + ($y - 455) * 0.15 } elseif ($y -le 530) { 597 - ($y - 495) * 0.25 } else { 588 + ($y - 530) * 0.16 }
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

# (C) 가까운 팔 안쪽 경계 armInnerEdge
$armInnerEdge = New-Object 'int[]' $h
for ($y = 430; $y -le 695; $y++) {
    if ($y -lt 475) {
        $armInnerEdge[$y] = [math]::Round(446 + ($y - 458) * 1.88)
    } elseif ($y -le 508) {
        $t = ($y - 475.0) / (508.0 - 475.0)
        $armInnerEdge[$y] = [math]::Round(478.0 * (1.0 - $t) + 464.0 * $t)
    } elseif ($y -le 645) {
        $found = 450
        for ($x = 430; $x -le 475; $x++) {
            if (-not $isChar[$x, $y]) { $found = $x - 1; break }
        }
        $armInnerEdge[$y] = $found
    } else {
        $armInnerEdge[$y] = 410
    }
}

# (D) 턱선 하단 경계 (Chin bottom Y)
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
# 1. b01_head_base.png (머리 소체)
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
# 2. b02_torso_upper.png (상체: 완전한 목 기둥 + 쇄골 + 클린 스킨)
# =========================================================================
$b02 = New-ChromaCanvas

# (2-A) 목 상단 둥근 캡 (목 피벗 513, 395 기준 반경 24px 반원 캡)
for ($y = 372; $y -le 406; $y++) {
    for ($x = 486; $x -le 540; $x++) {
        $dx = $x - 513.0
        $dy = $y - 395.0
        if (($dx * $dx + $dy * $dy) -le (24.0 * 24.0) -or $y -ge 395) {
            $sampleX = [math]::Max(488, [math]::Min(534, $x))
            $b02.SetPixel($x, $y, $srcBmp.GetPixel($sampleX, 412))
        }
    }
}

# (2-B) 상체 본체 (목 기둥 Y=406부터 허리 Y=652까지 연속 복사!)
for ($y = 400; $y -le 652; $y++) {
    $left = $torsoLeft[$y]
    $right = $torsoRight[$y]

    for ($x = $left; $x -le $right; $x++) {
        # 목 상단: 턱선 위쪽 얼굴 영역 제외
        if ($y -le ($chinBottomY[$x] - 2) -and ($x -lt 484 -or $x -gt 542)) { continue }

        # 허리 아래(Y > 620) 피벗(520, 620) 중심 둥근 캡 마감
        if ($y -gt 620) {
            $normX = ($x - 521.0) / 85.0
            if ([math]::Abs($normX) -gt 1.0) { continue }
            $capBottomY = 620.0 + 30.0 * [math]::Sqrt(1.0 - $normX * $normX)
            if ($y -gt $capBottomY) { continue }
        }

        # 팔과 닿아있던 겨드랑이/옆가슴 구간 (Y=458..508)
        if ($y -ge 458 -and $y -le 508) {
            if ($x -le 480) {
                # 팔 잔상 정화: 상체 피부 그라데이션 복사
                $b02.SetPixel($x, $y, $srcBmp.GetPixel(488, $y))
            } else {
                if ($isChar[$x, $y]) {
                    $b02.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
                }
            }
        } else {
            # 목, 쇄골, 일반 상체 픽셀은 원본 그대로 복사!
            if ($isChar[$x, $y]) {
                $b02.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
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
for ($y = 595; $y -le 698; $y++) {
    for ($x = 435; $x -le 608; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        if ($y -lt 620 -and $x -le $armInnerEdge[$y]) { continue }
        if ($y -lt 620 -and $x -gt $torsoRight[$y]) { continue }

        if ($y -lt 620) {
            $normX = ($x - 521.0) / 84.0
            if ([math]::Abs($normX) -gt 1.0) { continue }
            $capTopY = 620.0 - 25.0 * [math]::Sqrt(1.0 - $normX * $normX)
            if ($y -lt $capTopY) { continue }
        }

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
# 4. b04_arm_near_upper.png (가까운 팔 위: 녹색/갈색 줄무늬 0% 박멸 클린 어깨 볼)
# =========================================================================
$b04 = New-ChromaCanvas
$shX = 446.0; $shY = 458.0; $shR = 24.0
$elX = 415.0; $elY = 565.0; $elR = 25.0

# 어깨 중심 순수 피부 기준색 (R=254, G=225, B=206)
$shoulderSkin = $srcBmp.GetPixel(446, 458)

for ($y = 434; $y -le 592; $y++) {
    for ($x = 380; $x -le 480; $x++) {
        $dx = $x - $shX; $dy = $y - $shY
        $isShoulderBall = (($dx * $dx + $dy * $dy) -le ($shR * $shR))

        if ($isShoulderBall) {
            # 바깥쪽 허공(X < shX)은 원본 실루엣 밖 절대 침범 금지!
            if ($x -lt $shX) {
                if ($isChar[$x, $y]) {
                    $b04.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
                }
            } else {
                # 안쪽(X >= shX) 둥근 캡: 초록 배경이나 외곽선 묻어남 없는 순수 어깨 피부색으로 마감!
                $b04.SetPixel($x, $y, $shoulderSkin)
            }
            continue
        }

        # 일반 팔뚝 본체
        if (-not $isChar[$x, $y]) { continue }
        if ($x -gt $armInnerEdge[$y]) { continue }

        # 팔꿈치 아래쪽(Y > 565) 반원 캡
        if ($y -gt $elY) {
            $dxEl = $x - $elX; $dyEl = $y - $elY
            if (($dxEl * $dxEl + $dyEl * $dyEl) -gt ($elR * $elR)) { continue }
        }

        $b04.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
    }
}
$b04.Save((Join-Path $outDir "b04_arm_near_upper.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b04.Dispose()
Write-Host "Created: b04_arm_near_upper.png"

# =========================================================================
# 5. b05_arm_near_lower.png (가까운 팔 아래)
# =========================================================================
$b05 = New-ChromaCanvas
for ($y = 538; $y -le 690; $y++) {
    for ($x = 340; $x -le 445; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        if ($x -gt $armInnerEdge[$y]) { continue }

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
# 6. b06_arm_far_upper.png (먼 팔 위: 녹색 줄무늬 0% 차단)
# =========================================================================
$b06 = New-ChromaCanvas
$fshX = 582.0; $fshY = 460.0; $fshR = 24.0
$felX = 612.0; $felY = 565.0; $felR = 24.0
$farArmSkin = $srcBmp.GetPixel(600, 480)

for ($y = 436; $y -le 590; $y++) {
    $t = [math]::Max(0.0, [math]::Min(1.0, ($y - $fshY) / ($felY - $fshY)))
    $centerArmX = $fshX + $t * ($felX - $fshX)
    $halfW = 23.0 + $t * 3.0

    for ($x = 556; $x -le 642; $x++) {
        if ($y -lt $fshY) {
            $dx = $x - $fshX; $dy = $y - $fshY
            if (($dx * $dx + $dy * $dy) -gt ($fshR * $fshR)) { continue }
        }
        if ($y -gt $felY) {
            $dx = $x - $felX; $dy = $y - $felY
            if (($dx * $dx + $dy * $dy) -gt ($felR * $felR)) { continue }
        }

        if ($isChar[$x, $y] -and $x -gt ($torsoRight[$y] + 1)) {
            $b06.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
        } elseif ($x -ge ($centerArmX - $halfW) -and $x -le ($torsoRight[$y] + 1)) {
            $sampleX = [math]::Min($w - 1, $torsoRight[$y] + 5)
            if ($isChar[$sampleX, $y]) {
                $b06.SetPixel($x, $y, $srcBmp.GetPixel($sampleX, $y))
            } else {
                $b06.SetPixel($x, $y, $farArmSkin)
            }
        }
    }
}
$b06.Save((Join-Path $outDir "b06_arm_far_upper.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$b06.Dispose()
Write-Host "Created: b06_arm_far_upper.png"

# =========================================================================
# 7. b07_arm_far_lower.png (먼 팔 아래)
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
Write-Host "ALL 9 PARTS GENERATED FLAWLESSLY!"
