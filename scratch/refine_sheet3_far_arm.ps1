Add-Type -AssemblyName System.Drawing

$dir = Join-Path (Get-Location).Path "test\incoming\char_liana"
$brain = "C:\Users\NZIN\.gemini\antigravity\brain\a9b248b5-71cd-4fef-a353-af82a1fa0bb5"
$pureGreen = [System.Drawing.Color]::FromArgb(255, 0, 255, 0)
$darkLine = [System.Drawing.Color]::FromArgb(255, 52, 36, 28)

function Is-Green([System.Drawing.Color]$p) {
    return ($p.G -gt 145 -and $p.R -lt 125 -and $p.B -lt 125)
}

Write-Host "Refining sheet3_arms.png with 2-fold rolled cuff preserved on arm_far_upper..."
$s3 = [System.Drawing.Bitmap]::FromFile((Join-Path $dir "sheet3_arms_v1.png"))
$s3Out = New-Object System.Drawing.Bitmap($s3.Width, $s3.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($s3Out)
$g.DrawImage($s3, 0, 0, 1024, 1024)
$g.Dispose()

# (a) 가까운 위팔: 소매 아래 맨살 제거 및 소매 단 아래 테두리 외곽선 마감 (x=210..346, y=296..375)
for ($x = 210; $x -le 346; $x++) {
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
        for ($y = $lastCuffY + 1; $y -le ($lastCuffY + 3); $y++) {
            $s3Out.SetPixel($x, $y, $darkLine)
        }
        for ($y = $lastCuffY + 4; $y -le 376; $y++) {
            $s3Out.SetPixel($x, $y, $pureGreen)
        }
    } else {
        for ($y = 300; $y -le 376; $y++) {
            $s3Out.SetPixel($x, $y, $pureGreen)
        }
    }
}

# (b) 먼 위팔: 기존 좌하단 영역(x=150..420, y=550..900)을 지우고 새로 그린 arm_far_upper_v3를 회전 없이 단일 균일 배율(scale = 0.285)로 배치
for ($y = 550; $y -le 900; $y++) {
    for ($x = 150; $x -le 420; $x++) {
        $s3Out.SetPixel($x, $y, $pureGreen)
    }
}

$farRaw = [System.Drawing.Bitmap]::FromFile("$brain\arm_far_upper_v3_1795654812958.jpg")
# arm_far_upper_v3에서 2단 롤업 커프스(첫째 단 + 둘째 단)는 온전히 보존하고,
# 맨 오른쪽 아래의 오목한 소매 속 구멍(안쪽 어두운 타원면: 중심 (708, 705) 주변)만 깔끔하게 닫고
# 위쪽 어깨 돔(상체 아래로 들어가는 겹침 부분)의 단면 외곽선은 무테 마감
$ax = [Math]::Cos(43.0 * [Math]::PI / 180.0)
$ay = [Math]::Sin(43.0 * [Math]::PI / 180.0)
$px = -$ay; $py = $ax

$farClean = New-Object System.Drawing.Bitmap($farRaw.Width, $farRaw.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
for ($y = 0; $y -lt 1024; $y++) {
    for ($x = 0; $x -lt 1024; $x++) {
        $p = $farRaw.GetPixel($x, $y)
        if (Is-Green $p) {
            $farClean.SetPixel($x, $y, $pureGreen)
            continue
        }
        $dx = $x - 260.0; $dy = $y - 250.0
        $proj = $dx * $ax + $dy * $ay
        $perp = $dx * $px + $dy * $py
        # 2단 롤업 커프스의 앞쪽 테두리 아치(projMax = 548 + 0.0020 * perp^2)에서 닫아 오목한 소매 구멍 단면을 비우고 가까운 위팔과 동일한 아치형 커프스 단으로 마감!
        $projMax = 548.0 + 0.0020 * ($perp * $perp)
        if ($proj -gt $projMax) {
            $farClean.SetPixel($x, $y, $pureGreen)
        } elseif ($proj -ge ($projMax - 12.0)) {
            $farClean.SetPixel($x, $y, $darkLine)
        } elseif ($proj -lt 60.0) {
            # 위쪽 어깨 돔(상체 밑으로 들어가는 30-40px 겹침 부분) 단면 외곽선 제거
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

# 회전 없이(0도) 단일 균일 배율 scale = 0.285 만 적용하여 (dstCx=280, dstCy=720)에 배치
$scaleFar = 0.285
$sx0 = 195; $sy0 = 180; $sx1 = 830; $sy1 = 840
$sw = $sx1 - $sx0 + 1; $sh = $sy1 - $sy0 + 1
$dw = [int][Math]::Round($sw * $scaleFar)
$dh = [int][Math]::Round($sh * $scaleFar)
$dx0 = 280 - [int]($dw / 2)
$dy0 = 720 - [int]($dh / 2)

for ($dy = 0; $dy -lt $dh; $dy++) {
    $ty = $dy0 + $dy
    $sy = $sy0 + ($dy / $scaleFar)
    $iy = [int][Math]::Floor($sy); $fy = $sy - $iy
    for ($dx = 0; $dx -lt $dw; $dx++) {
        $tx = $dx0 + $dx
        $sx = $sx0 + ($dx / $scaleFar)
        $ix = [int][Math]::Floor($sx); $fx = $sx - $ix

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

# sheet2_body.png도 24bpp RGB로 다시 저장하여 RGB 형식 통일
$s2Tmp = [System.Drawing.Bitmap]::FromFile((Join-Path $dir "sheet2_body.png"))
$s2Rgb = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g2 = [System.Drawing.Graphics]::FromImage($s2Rgb)
$g2.DrawImage($s2Tmp, 0, 0, 1024, 1024)
$g2.Dispose()
$s2Tmp.Dispose()
$s2Rgb.Save((Join-Path $dir "sheet2_body.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$s2Rgb.Dispose()

Write-Host "Refined sheet3_arms.png and converted sheet2_body.png to 24bpp RGB"
