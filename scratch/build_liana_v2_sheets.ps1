Add-Type -AssemblyName System.Drawing

$brain = "C:\Users\NZIN\.gemini\antigravity\brain\a9b248b5-71cd-4fef-a353-af82a1fa0bb5"
$outDir = Join-Path (Get-Location).Path "test\incoming\char_liana"
$pureGreen = [System.Drawing.Color]::FromArgb(255, 0, 255, 0)

function Is-GreenBg([System.Drawing.Color]$p) {
    return ($p.G -gt 145 -and $p.R -lt 125 -and $p.B -lt 125)
}

function New-GreenCanvas([int]$w = 1024, [int]$h = 1024) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(255, 0, 255, 0))
    $g.Dispose()
    return $bmp
}

function Copy-ScaledRegion(
    [System.Drawing.Bitmap]$src,
    [int]$sx0, [int]$sy0, [int]$sx1, [int]$sy1,
    [System.Drawing.Bitmap]$dst,
    [int]$dstCx, [int]$dstCy,
    [double]$scale
) {
    $sw = $sx1 - $sx0 + 1
    $sh = $sy1 - $sy0 + 1
    $dw = [int][Math]::Round($sw * $scale)
    $dh = [int][Math]::Round($sh * $scale)
    $dx0 = $dstCx - [int]($dw / 2)
    $dy0 = $dstCy - [int]($dh / 2)

    for ($dy = 0; $dy -lt $dh; $dy++) {
        $ty = $dy0 + $dy
        if ($ty -lt 4 -or $ty -ge ($dst.Height - 4)) { continue }
        $sy = $sy0 + ($dy / $scale)
        $iy = [Math]::Max($sy0, [Math]::Min($sy1 - 1, [int][Math]::Floor($sy)))
        $fy = $sy - $iy

        for ($dx = 0; $dx -lt $dw; $dx++) {
            $tx = $dx0 + $dx
            if ($tx -lt 4 -or $tx -ge ($dst.Width - 4)) { continue }
            $sx = $sx0 + ($dx / $scale)
            $ix = [Math]::Max($sx0, [Math]::Min($sx1 - 1, [int][Math]::Floor($sx)))
            $fx = $sx - $ix

            $rSum = 0.0; $gSum = 0.0; $bSum = 0.0; $wSum = 0.0
            for ($oy = 0; $oy -le 1; $oy++) {
                $wy = if ($oy -eq 0) { 1.0 - $fy } else { $fy }
                for ($ox = 0; $ox -le 1; $ox++) {
                    $wx = if ($ox -eq 0) { 1.0 - $fx } else { $fx }
                    $wt = $wx * $wy
                    $p = $src.GetPixel($ix + $ox, $iy + $oy)
                    if (-not (Is-GreenBg $p)) {
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
                $dst.SetPixel($tx, $ty, [System.Drawing.Color]::FromArgb(255, $rr, $gg, $bb))
            }
        }
    }
}

# ==============================================================================
# 1. SHEET 1: sheet1_head.png (6개: 머리 소체, 앞·옆머리, 뒷머리, 표정 기본, 눈 감음, 공격)
#    균일 배율 scale = 0.86
# ==============================================================================
Write-Host "Building sheet1_head.png..."
$s1Raw = [System.Drawing.Bitmap]::FromFile("$brain\sheet1_head_v2_1795506389454.jpg")
$s1Work = New-Object System.Drawing.Bitmap($s1Raw)

# (a) head_base (x=42..335, y=42..453): 목 아래 쇄골 퍼짐(y >= 355)을 둥근 피부색 목 기둥+돔(단면 외곽선 없음)으로 정리
$neckSkin = [System.Drawing.Color]::FromArgb(255, 248, 203, 178)
$neckShadow = [System.Drawing.Color]::FromArgb(255, 224, 172, 146)
for ($y = 355; $y -le 455; $y++) {
    for ($x = 40; $x -le 338; $x++) {
        $s1Work.SetPixel($x, $y, $pureGreen)
    }
}
for ($y = 345; $y -le 410; $y++) {
    for ($x = 152; $x -le 214; $x++) {
        $inside = $false
        if ($y -le 378) {
            $inside = $true
        } else {
            $dist = [Math]::Sqrt((($x - 183.0) * ($x - 183.0)) + (($y - 378.0) * ($y - 378.0)))
            if ($dist -le 31.0) { $inside = $true }
        }
        if ($inside) {
            $col = if ($x -lt 168 -or $y -lt 360) { $neckShadow } else { $neckSkin }
            $s1Work.SetPixel($x, $y, $col)
        }
    }
}

# (b) 표정 3종 (Cell 1,0: x=40..314, Cell 1,1: x=377..651, Cell 1,2: x=714..989, y=655..957)
# 귀(y=825..905에서 왼쪽으로 불룩 튀어나온 x < 72..92 부분)만 볼록한 달걀형 두상 곡선 연장선(x_head(y))을 따라 매끄럽게 제거!
# y=810에서의 두상 왼쪽 끝은 x=49, y=910에서의 턱선 시작은 x=95이므로,
# 볼록한 타원 호(바깥쪽으로 둥근 곡선)를 따라 귀만 깔끔하게 잘라내고 3px 외곽선으로 마감한다.
for ($y = 815; $y -le 908; $y++) {
    $t = ($y - 815.0) / 93.0
    # 바깥쪽으로 볼록한 자연스러운 광대-턱 연결 곡선 (t^1.8 곡선으로 안쪽 파임 0%)
    $cutX = [int][Math]::Round(50.0 + 46.0 * [Math]::Pow($t, 1.85))
    for ($x = 38; $x -le ($cutX + 18); $x++) {
        if ($x -lt $cutX) {
            $s1Work.SetPixel($x, $y, $pureGreen)
        } elseif ($x -ge $cutX -and $x -le ($cutX + 3)) {
            $s1Work.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, 68, 38, 28))
        } else {
            # 귀 내부의 검은 귓바퀴 선(x = cutX+4 .. cutX+16)을 볼 음영 피부색으로 깨끗이 메움
            $p = $s1Work.GetPixel($x, $y)
            if (-not (Is-GreenBg $p)) {
                $lum = 0.3 * $p.R + 0.59 * $p.G + 0.11 * $p.B
                if ($lum -lt 165) {
                    $s1Work.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, 233, 180, 152))
                }
            }
        }
    }
}

# 확정된 기본 표정(Cell 1,0)의 얼굴 윤곽을 Cell 1,1(dx=+337)과 Cell 1,2(dx=+674)에 100% 동일하게 복사하고 내부 이목구비만 합성
for ($idx = 1; $idx -le 2; $idx++) {
    $offsetX = $idx * 337
    for ($y = 655; $y -le 957; $y++) {
        for ($x = 40; $x -le 314; $x++) {
            $baseP = $s1Work.GetPixel($x, $y)
            $tx = $x + $offsetX
            $isInnerFeature = ($x -ge 105 -and $x -le 298 -and $y -ge 750 -and $y -le 932 -and -not (Is-GreenBg $baseP))
            if ($isInnerFeature) {
                $rightEdge = $s1Work.GetPixel([Math]::Min(314, $x + 6), $y)
                $botEdge = $s1Work.GetPixel($x, [Math]::Min(957, $y + 6))
                if (-not (Is-GreenBg $rightEdge) -and -not (Is-GreenBg $botEdge)) {
                    $exprP = $s1Raw.GetPixel($tx, $y)
                    if (-not (Is-GreenBg $exprP)) {
                        $s1Work.SetPixel($tx, $y, $exprP)
                        continue
                    }
                }
            }
            $s1Work.SetPixel($tx, $y, $baseP)
        }
    }
}

$s1Out = New-GreenCanvas 1024 1024
$scale1 = 0.86
# 1. 머리 소체 (head_base) - sx1=334로 하여 hair_front 왼쪽 끝(x=341)이 섞이지 않게 함
Copy-ScaledRegion $s1Work 42 42 334 412 $s1Out 175 245 $scale1
# 2. 앞·옆머리 (hair_front)
Copy-ScaledRegion $s1Work 341 42 681 362 $s1Out 512 245 $scale1
# 3. 뒷머리 (hair_back)
Copy-ScaledRegion $s1Work 693 45 1012 359 $s1Out 850 245 $scale1
# 4. 표정 기본 (face_neutral)
Copy-ScaledRegion $s1Work 40 655 314 957 $s1Out 175 755 $scale1
# 5. 표정 눈 감음 (face_blink)
Copy-ScaledRegion $s1Work 377 655 651 957 $s1Out 512 755 $scale1
# 6. 표정 공격 (face_attack)
Copy-ScaledRegion $s1Work 714 655 988 957 $s1Out 850 755 $scale1

$s1Out.Save((Join-Path $outDir "sheet1_head.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$s1Out.Dispose(); $s1Work.Dispose(); $s1Raw.Dispose()

# ==============================================================================
# 2. SHEET 2: sheet2_body.png (3개: 상체, 골반, 뒷자락)
#    균일 배율 scale = 0.56
# ==============================================================================
Write-Host "Building sheet2_body.png..."
$s2Raw = [System.Drawing.Bitmap]::FromFile("$brain\sheet2_body_v2_1795506382526.jpg")
$s2Work = New-Object System.Drawing.Bitmap($s2Raw)

$tunicCream = [System.Drawing.Color]::FromArgb(255, 235, 224, 205)
$tunicShade = [System.Drawing.Color]::FromArgb(255, 198, 182, 160)
for ($y = 425; $y -le 487; $y++) {
    for ($x = 140; $x -le 410; $x++) {
        $p = $s2Work.GetPixel($x, $y)
        if (-not (Is-GreenBg $p)) {
            $lum = 0.3 * $p.R + 0.59 * $p.G + 0.11 * $p.B
            if ($lum -lt 135) { $s2Work.SetPixel($x, $y, $tunicCream) }
        }
    }
}
for ($y = 125; $y -le 265; $y++) {
    for ($x = 97; $x -le 172; $x++) {
        $p = $s2Work.GetPixel($x, $y)
        if (-not (Is-GreenBg $p)) {
            $lum = 0.3 * $p.R + 0.59 * $p.G + 0.11 * $p.B
            if ($lum -lt 125) { $s2Work.SetPixel($x, $y, $tunicShade) }
        }
    }
}
for ($y = 119; $y -le 188; $y++) {
    for ($x = 580; $x -le 880; $x++) {
        $p = $s2Work.GetPixel($x, $y)
        if (-not (Is-GreenBg $p)) {
            $lum = 0.3 * $p.R + 0.59 * $p.G + 0.11 * $p.B
            if ($lum -lt 140) { $s2Work.SetPixel($x, $y, $tunicCream) }
        }
    }
}
for ($y = 556; $y -le 638; $y++) {
    for ($x = 370; $x -le 650; $x++) {
        $p = $s2Work.GetPixel($x, $y)
        if (-not (Is-GreenBg $p)) {
            $lum = 0.3 * $p.R + 0.59 * $p.G + 0.11 * $p.B
            if ($lum -lt 140) { $s2Work.SetPixel($x, $y, $tunicShade) }
        }
    }
}

$s2Out = New-GreenCanvas 1024 1024
$scale2 = 0.56
Copy-ScaledRegion $s2Work 97 74 429 487 $s2Out 280 260 $scale2
Copy-ScaledRegion $s2Work 541 119 926 439 $s2Out 740 260 $scale2
Copy-ScaledRegion $s2Work 321 556 702 925 $s2Out 512 720 $scale2

$s2Out.Save((Join-Path $outDir "sheet2_body.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$s2Out.Dispose(); $s2Work.Dispose(); $s2Raw.Dispose()

# ==============================================================================
# 3. SHEET 3: sheet3_arms.png (4개: 가까운 위팔, 가까운 아래팔, 먼 위팔, 먼 아래팔)
#    균일 배율 scale = 0.60
# ==============================================================================
Write-Host "Building sheet3_arms.png..."
$s3Raw = [System.Drawing.Bitmap]::FromFile("$brain\sheet3_arms_final_1795506418917.jpg")
$s3Work = New-Object System.Drawing.Bitmap($s3Raw)
$armSkin = [System.Drawing.Color]::FromArgb(255, 252, 198, 168)
$armShade = [System.Drawing.Color]::FromArgb(255, 228, 168, 138)
$sleeveCream = [System.Drawing.Color]::FromArgb(255, 235, 226, 208)

# (a) 가까운 위팔: 어깨 돔 무테 마감 + 아래쪽 팔꿈치 피부색 돔(y=425에서의 가로 색상을 이어받아 +35px 둥근 돔으로 연장)
for ($y = 92; $y -le 155; $y++) {
    for ($x = 220; $x -le 365; $x++) {
        $p = $s3Work.GetPixel($x, $y)
        if (-not (Is-GreenBg $p)) {
            $lum = 0.3 * $p.R + 0.59 * $p.G + 0.11 * $p.B
            if ($lum -lt 130) { $s3Work.SetPixel($x, $y, $sleeveCream) }
        }
    }
}
for ($y = 425; $y -le 480; $y++) {
    for ($x = 155; $x -le 240; $x++) {
        $dist = [Math]::Sqrt((($x - 196.0) * ($x - 196.0)) + (($y - 438.0) * ($y - 438.0)))
        if ($dist -le 37.0) {
            # y=420 라인의 실제 팔 피부/음영 색상을 샘플링하여 이음새 없이 연장
            $sampleP = $s3Raw.GetPixel([Math]::Max(164, [Math]::Min(228, $x)), 420)
            $col = if (-not (Is-GreenBg $sampleP) -and (0.3*$sampleP.R + 0.59*$sampleP.G + 0.11*$sampleP.B) -gt 140) { $sampleP } else { $armSkin }
            $s3Work.SetPixel($x, $y, $col)
        }
    }
}

# (b) 가까운 아래팔: 위쪽 팔꿈치 겹침 돔(y=140..215) 내부의 가로 호선을 바로 아래(y=218)의 팔 피부색으로 자연스럽게 클로닝
for ($y = 140; $y -le 215; $y++) {
    for ($x = 746; $x -le 855; $x++) {
        $p = $s3Work.GetPixel($x, $y)
        if (-not (Is-GreenBg $p)) {
            $lum = 0.3 * $p.R + 0.59 * $p.G + 0.11 * $p.B
            $isSideBorder = ($y -ge 195 -and ($x -le 751 -or $x -ge 849))
            if ($lum -lt 160 -and -not $isSideBorder) {
                $col = if ($x -gt 815) { $armShade } else { $armSkin }
                $s3Work.SetPixel($x, $y, $col)
            }
        }
    }
}

# (c) 먼 위팔: 어깨 돔 무테 마감 + 아래쪽 팔꿈치 피부색 돔 샘플링 연장
for ($y = 575; $y -le 640; $y++) {
    for ($x = 160; $x -le 295; $x++) {
        $p = $s3Work.GetPixel($x, $y)
        if (-not (Is-GreenBg $p)) {
            $lum = 0.3 * $p.R + 0.59 * $p.G + 0.11 * $p.B
            if ($lum -lt 130) { $s3Work.SetPixel($x, $y, $sleeveCream) }
        }
    }
}
for ($y = 895; $y -le 955; $y++) {
    for ($x = 250; $x -le 335; $x++) {
        $dist = [Math]::Sqrt((($x - 293.0) * ($x - 293.0)) + (($y - 910.0) * ($y - 910.0)))
        if ($dist -le 38.0) {
            $sampleP = $s3Raw.GetPixel([Math]::Max(260, [Math]::Min(324, $x)), 890)
            $col = if (-not (Is-GreenBg $sampleP) -and (0.3*$sampleP.R + 0.59*$sampleP.G + 0.11*$sampleP.B) -gt 140) { $sampleP } else { $armSkin }
            $s3Work.SetPixel($x, $y, $col)
        }
    }
}

# (d) 먼 아래팔: L자 윗부분(y < 716)을 지우고 y=745 라인의 실제 피부색/음영 프로파일을 이어받은 반원형 겹침 돔(중심 670, 758, 반지름 48)으로 마감
for ($y = 635; $y -le 758; $y++) {
    for ($x = 615; $x -le 735; $x++) {
        $s3Work.SetPixel($x, $y, $pureGreen)
    }
}
for ($y = 710; $y -le 762; $y++) {
    for ($x = 620; $x -le 720; $x++) {
        $dist = [Math]::Sqrt((($x - 670.0) * ($x - 670.0)) + (($y - 758.0) * ($y - 758.0)))
        if ($dist -le 48.0) {
            $sampleP = $s3Raw.GetPixel([Math]::Max(626, [Math]::Min(716, $x)), 742)
            $col = if (-not (Is-GreenBg $sampleP) -and (0.3*$sampleP.R + 0.59*$sampleP.G + 0.11*$sampleP.B) -gt 135) { $sampleP } else { $armSkin }
            $s3Work.SetPixel($x, $y, $col)
        }
    }
}

$s3Out = New-GreenCanvas 1024 1024
$scale3 = 0.60
Copy-ScaledRegion $s3Work 150 92 374 480 $s3Out 280 260 $scale3
Copy-ScaledRegion $s3Work 637 140 856 426 $s3Out 740 260 $scale3
Copy-ScaledRegion $s3Work 160 575 383 955 $s3Out 280 740 $scale3
Copy-ScaledRegion $s3Work 617 710 889 865 $s3Out 740 740 $scale3

$s3Out.Save((Join-Path $outDir "sheet3_arms.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$s3Out.Dispose(); $s3Work.Dispose(); $s3Raw.Dispose()

# ==============================================================================
# 4. SHEET 4: sheet4_legs_weapons.png (4개: 가까운 다리, 먼 다리, 주무기, 보조무기)
#    균일 배율 scale = 0.65
# ==============================================================================
Write-Host "Building sheet4_legs_weapons.png..."
$s4Raw = [System.Drawing.Bitmap]::FromFile("$brain\sheet4_legs_weapons_1795506367940.jpg")
$s4Work = New-Object System.Drawing.Bitmap($s4Raw)
$pantsNavy = [System.Drawing.Color]::FromArgb(255, 58, 70, 92)
$pantsShade = [System.Drawing.Color]::FromArgb(255, 44, 53, 72)

# (a) 가까운 다리 (Cell 0,0 왼쪽 다리: x=129..282, y=130..478): y=235에서의 다리 폭(x=161..281, 중심 221, 반지름 60)에 맞춘 매끈한 반원형 고관절 돔
for ($y = 70; $y -le 480; $y++) {
    for ($x = 282; $x -le 435; $x++) {
        $s4Work.SetPixel($x, $y, $pureGreen)
    }
    if ($y -lt 235) {
        for ($x = 125; $x -le 282; $x++) {
            $s4Work.SetPixel($x, $y, $pureGreen)
        }
    }
}
for ($y = 135; $y -le 235; $y++) {
    for ($x = 161; $x -le 281; $x++) {
        $inside = $false
        if ($y -ge 195) {
            $inside = $true
        } else {
            $dist = [Math]::Sqrt((($x - 221.0) * ($x - 221.0)) + (($y - 195.0) * ($y - 195.0)))
            if ($dist -le 60.0) { $inside = $true }
        }
        if ($inside) {
            $col = if ($x -lt 182 -or $x -gt 264) { $pantsShade } else { $pantsNavy }
            $s4Work.SetPixel($x, $y, $col)
        }
    }
}

# (b) 먼 다리 (Cell 0,1 오른쪽 다리: x=764..909, y=135..478): y=240에서의 다리 폭(x=766..874, 중심 820, 반지름 54)에 맞춘 단차 없는 매끈한 반원형 고관절 돔
for ($y = 70; $y -le 480; $y++) {
    for ($x = 600; $x -le 765; $x++) {
        $s4Work.SetPixel($x, $y, $pureGreen)
    }
    if ($y -lt 240) {
        for ($x = 766; $x -le 915; $x++) {
            $s4Work.SetPixel($x, $y, $pureGreen)
        }
    }
}
for ($y = 142; $y -le 240; $y++) {
    for ($x = 766; $x -le 874; $x++) {
        $inside = $false
        if ($y -ge 196) {
            $inside = $true
        } else {
            $dist = [Math]::Sqrt((($x - 820.0) * ($x - 820.0)) + (($y - 196.0) * ($y - 196.0)))
            if ($dist -le 54.0) { $inside = $true }
        }
        if ($inside) {
            $col = if ($x -lt 784 -or $x -gt 858) { $pantsShade } else { $pantsNavy }
            $s4Work.SetPixel($x, $y, $col)
        }
    }
}

$s4Out = New-GreenCanvas 1024 1024
$scale4 = 0.65
Copy-ScaledRegion $s4Work 129 130 282 478 $s4Out 280 250 $scale4
Copy-ScaledRegion $s4Work 765 135 909 478 $s4Out 740 250 $scale4
Copy-ScaledRegion $s4Work 83 556 491 974 $s4Out 280 735 $scale4
Copy-ScaledRegion $s4Work 599 547 930 986 $s4Out 740 735 $scale4

$s4Out.Save((Join-Path $outDir "sheet4_legs_weapons.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$s4Out.Dispose(); $s4Work.Dispose(); $s4Raw.Dispose()

Write-Host "All 4 sheets successfully rebuilt in $outDir"
