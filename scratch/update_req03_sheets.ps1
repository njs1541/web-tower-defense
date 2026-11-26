Add-Type -AssemblyName System.Drawing

$dir = Join-Path (Get-Location).Path "test\incoming\char_liana"
$brain = "C:\Users\NZIN\.gemini\antigravity\brain\a9b248b5-71cd-4fef-a353-af82a1fa0bb5"
$pureGreen = [System.Drawing.Color]::FromArgb(255, 0, 255, 0)
$darkLine = [System.Drawing.Color]::FromArgb(255, 52, 36, 28)

function Is-Green([System.Drawing.Color]$p) {
    return ($p.G -gt 145 -and $p.R -lt 125 -and $p.B -lt 125)
}

# ==============================================================================
# 1. [수정 2] sheet2_body.png
#    - 골반, 뒷자락: sheet2_body_v1.png 픽셀 그대로 유지
#    - 상체(torso, x=187..372, y=144..375):
#      (a) 깃의 V자 트임 안쪽(목 살이 보이는 자리)을 배경색(#00FF00)으로 비우고 테두리를 외곽선으로 닫음
#      (b) 아래 끝은 흉갑 아래 테두리에서 끝내고 그 아래 천(y=326..375)을 모두 지움
# ==============================================================================
Write-Host "Updating sheet2_body.png..."
$s2 = [System.Drawing.Bitmap]::FromFile((Join-Path $dir "sheet2_body_v1.png"))
$s2Out = New-Object System.Drawing.Bitmap($s2)

# (a) 깃의 V자 트임 안쪽 및 목 구멍 뒤판 비우기 (y=144..195)
for ($y = 144; $y -le 195; $y++) {
    # 왼쪽 깃 안쪽 V자 경계선과 오른쪽 깃 안쪽 V자 경계선
    $leftX = if ($y -le 160) {
        [int][Math]::Round(248.0 + ($y - 144.0) * 0.85)
    } else {
        [int][Math]::Round(261.6 + ($y - 160.0) * 1.15)
    }
    $rightX = if ($y -le 168) {
        [int][Math]::Round(315.0 - (168.0 - $y) * 0.25)
    } else {
        [int][Math]::Round(315.0 - ($y - 168.0) * 0.42)
    }

    if ($leftX -le $rightX) {
        for ($x = $leftX; $x -le $rightX; $x++) {
            $s2Out.SetPixel($x, $y, $pureGreen)
        }
        # 양쪽 깃 안쪽 V자 트임 경계를 선명한 외곽선(2px)으로 닫음 (단, 전경이 있는 높이에서만)
        if ($y -ge 152) {
            for ($t = 1; $t -le 2; $t++) {
                if (($leftX - $t) -ge 240 -and -not (Is-Green ($s2.GetPixel($leftX - $t, $y)))) {
                    $s2Out.SetPixel($leftX - $t, $y, $darkLine)
                }
                if (($rightX + $t) -le 330 -and -not (Is-Green ($s2.GetPixel($rightX + $t, $y)))) {
                    $s2Out.SetPixel($rightX + $t, $y, $darkLine)
                }
            }
        }
    }
}

# (b) 상체 아래 끝을 흉갑 아래 테두리에서 끝내고 그 아래 천 제거 (x=187..372, y=315..376)
for ($x = 187; $x -le 372; $x++) {
    # y=285..345 구간에서 마지막 은색 흉갑 픽셀(채도 낮은 회백색: |R - B| <= 17)을 찾음
    $lastArmorY = -1
    for ($y = 285; $y -le 343; $y++) {
        $p = $s2.GetPixel($x, $y)
        if (-not (Is-Green $p)) {
            $lum = 0.3*$p.R + 0.59*$p.G + 0.11*$p.B
            $diffRB = $p.R - $p.B
            if ($diffRB -le 17 -and $lum -ge 90) {
                $lastArmorY = $y
            }
        }
    }

    if ($lastArmorY -gt 0) {
        # lastArmorY 바로 아래의 검은 외곽선(최대 +4px)까지만 남기고 그 아래 크림색 천은 모두 배경색으로 지움
        $cutY = $lastArmorY + 3
        for ($y = $lastArmorY + 1; $y -le $cutY; $y++) {
            $s2Out.SetPixel($x, $y, $darkLine)
        }
        for ($y = $cutY + 1; $y -le 378; $y++) {
            $s2Out.SetPixel($x, $y, $pureGreen)
        }
    } else {
        # 흉갑 양끝 밖의 아래쪽 천 조각도 제거
        for ($y = 325; $y -le 378; $y++) {
            $s2Out.SetPixel($x, $y, $pureGreen)
        }
    }
}

$s2Out.Save((Join-Path $dir "sheet2_body.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$s2Out.Dispose(); $s2.Dispose()

# ==============================================================================
# 2. [수정 1] sheet3_arms.png
#    - 가까운 아래팔, 먼 아래팔: sheet3_arms_v1.png 픽셀 그대로 유지
#    - 가까운 위팔(arm_near_upper, x=212..346, y=144..373):
#      걷은 소매 단에서 끝내고, 소매 아래 맨살(y=300..373의 살색 영역)을 지운 뒤 소매 단 아래 테두리를 외곽선으로 닫음
#    - 먼 위팔(arm_far_upper, 좌하단):
#      가까운 위팔 반전본을 지우고, 새로 그린 arm_far_upper_v3_1795654812958.jpg를
#      소매 바깥쪽(방패 쪽, 오른쪽 아래) 각도로 맞춰 걷은 소매 단에서 외곽선으로 닫아 같은 배율로 배치
# ==============================================================================
Write-Host "Updating sheet3_arms.png..."
$s3 = [System.Drawing.Bitmap]::FromFile((Join-Path $dir "sheet3_arms_v1.png"))
$s3Out = New-Object System.Drawing.Bitmap($s3)

# (a) 가까운 위팔: 소매 아래 맨살 제거 및 소매 단 아래 테두리 외곽선 마감 (x=210..346, y=296..375)
for ($x = 210; $x -le 346; $x++) {
    # y=260..324에서 마지막 크림색 소매 단 픽셀(살색이 아닌 천 픽셀: (R - G) <= 24 and lum >= 105)의 Y좌표를 찾음
    $lastCuffY = -1
    for ($y = 260; $y -le 322; $y++) {
        $p = $s3.GetPixel($x, $y)
        if (-not (Is-Green $p)) {
            $lum = 0.3*$p.R + 0.59*$p.G + 0.11*$p.B
            $rgDiff = [int]$p.R - [int]$p.G
            if ($rgDiff -le 24 -and $lum -ge 100) {
                $lastCuffY = $y
            }
        }
    }

    if ($lastCuffY -ge 275) {
        # 소매 단 바로 아래 3px을 어두운 외곽선으로 닫고, 그 아래 맨살은 모두 녹색 배경으로 지움
        for ($y = $lastCuffY + 1; $y -le ($lastCuffY + 3); $y++) {
            $s3Out.SetPixel($x, $y, $darkLine)
        }
        for ($y = $lastCuffY + 4; $y -le 376; $y++) {
            $s3Out.SetPixel($x, $y, $pureGreen)
        }
    } else {
        # 소매 폭 바깥쪽 아래에 있던 맨살 픽셀 제거
        for ($y = 300; $y -le 376; $y++) {
            $s3Out.SetPixel($x, $y, $pureGreen)
        }
    }
}

# (b) 먼 위팔: 기존 좌하단 영역(x=150..420, y=550..900)을 지우고 새로 그린 arm_far_upper 배치
for ($y = 550; $y -le 900; $y++) {
    for ($x = 150; $x -le 420; $x++) {
        $s3Out.SetPixel($x, $y, $pureGreen)
    }
}

$farRaw = [System.Drawing.Bitmap]::FromFile("$brain\arm_far_upper_v3_1795654812958.jpg")
# arm_far_upper_v3 (bbox 200..824, 186..838)에서 오른쪽 아래 소매 구멍 단면(속 구멍)을 잘라내고
# 시계 방향 20도 회전 + 기존 위팔과 동일한 스케일(0.285)로 변환하여 (cx=280, cy=715)에 배치
# 소매 구멍 단면 절단 평면: 중심(512, 512) 기준 팔 축 벡터(cos 43°, sin 43°) 방향으로 커프스 첫 번째 롤 단에서 닫음
$ax = [Math]::Cos(43.0 * [Math]::PI / 180.0)
$ay = [Math]::Sin(43.0 * [Math]::PI / 180.0)
$px = -$ay; $py = $ax # 수직 벡터

$farClean = New-Object System.Drawing.Bitmap($farRaw.Width, $farRaw.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
for ($y = 0; $y -lt 1024; $y++) {
    for ($x = 0; $x -lt 1024; $x++) {
        $p = $farRaw.GetPixel($x, $y)
        if (Is-Green $p) {
            $farClean.SetPixel($x, $y, $pureGreen)
            continue
        }
        # 어깨 시작점(280, 260)으로부터 팔 길이 방향 거리 proj와 수직 거리 perp 계산
        $dx = $x - 280.0; $dy = $y - 260.0
        $proj = $dx * $ax + $dy * $ay
        $perp = $dx * $px + $dy * $py
        # 커프스 아랫단 경계 곡선: projMax = 535 - 0.0012 * perp * perp (속 구멍 타원 단면을 제외하고 롤업 커프스 바깥 단에서 깔끔히 닫음)
        $projMax = 538.0 - 0.0015 * ($perp * $perp)
        if ($proj -gt $projMax) {
            $farClean.SetPixel($x, $y, $pureGreen)
        } elseif ($proj -ge ($projMax - 11.0)) {
            # 걷은 소매 단 아래 테두리를 굵고 선명한 외곽선으로 닫음
            $farClean.SetPixel($x, $y, $darkLine)
        } elseif ($proj -lt 65.0) {
            # 위쪽 어깨 돔(상체 아래로 들어가는 30-40px 겹침 여백)의 단면 외곽선은 안쪽 크림색으로 무테 마감
            $lum = 0.3*$p.R + 0.59*$p.G + 0.11*$p.B
            if ($lum -lt 135) {
                $farClean.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, 235, 224, 206))
            } else {
                $farClean.SetPixel($x, $y, $p)
            }
        } else {
            $farClean.SetPixel($x, $y, $p)
        }
    }
}

# 회전(+18도: 방패 쪽인 오른쪽 아래로 자연스럽게 내려오는 각도) 및 단일 균일 배율(scale = 0.285)로 (dstCx=280, dstCy=715)에 배치
$rotRad = 18.0 * [Math]::PI / 180.0
$cosR = [Math]::Cos($rotRad); $sinR = [Math]::Sin($rotRad)
$scaleFar = 0.285
$srcCx = 490.0; $srcCy = 490.0
$dstCx = 280; $dstCy = 715

for ($dy = -110; $dy -le 110; $dy++) {
    $ty = $dstCy + $dy
    if ($ty -lt 550 -or $ty -ge 900) { continue }
    for ($dx = -90; $dx -le 90; $dx++) {
        $tx = $dstCx + $dx
        if ($tx -lt 160 -or $tx -ge 400) { continue }
        # 역회전 및 역스케일
        $ux = $dx / $scaleFar
        $uy = $dy / $scaleFar
        $sx = $srcCx + ($ux * $cosR + $uy * $sinR)
        $sy = $srcCy + (-$ux * $sinR + $uy * $cosR)
        if ($sx -lt 10 -or $sx -ge 1010 -or $sy -lt 10 -or $sy -ge 1010) { continue }

        $ix = [int][Math]::Floor($sx); $iy = [int][Math]::Floor($sy)
        $fx = $sx - $ix; $fy = $sy - $iy

        $rSum = 0.0; $gSum = 0.0; $bSum = 0.0; $wSum = 0.0
        for ($oy = 0; $oy -le 1; $oy++) {
            $wy = if ($oy -eq 0) { 1.0 - $fy } else { $fy }
            for ($ox = 0; $ox -le 1; $ox++) {
                $wx = if ($ox -eq 0) { 1.0 - $fx } else { $fx }
                $wt = $wx * $wy
                $p = $farClean.GetPixel($ix + $ox, $iy + $oy)
                if (-not (Is-Green $p)) {
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
            $s3Out.SetPixel($tx, $ty, [System.Drawing.Color]::FromArgb(255, $rr, $gg, $bb))
        }
    }
}

$s3Out.Save((Join-Path $dir "sheet3_arms.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$farClean.Dispose(); $farRaw.Dispose(); $s3Out.Dispose(); $s3.Dispose()

Write-Host "Successfully updated sheet2_body.png and sheet3_arms.png"
