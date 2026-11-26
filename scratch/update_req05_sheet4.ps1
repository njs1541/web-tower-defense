Add-Type -AssemblyName System.Drawing

$dir = Join-Path (Get-Location).Path "test\incoming\char_liana"
$brain = "C:\Users\NZIN\.gemini\antigravity\brain\a9b248b5-71cd-4fef-a353-af82a1fa0bb5"
$pureGreen = [System.Drawing.Color]::FromArgb(255, 0, 255, 0)
$darkLine = [System.Drawing.Color]::FromArgb(255, 48, 34, 20)
$skinHighlight = [System.Drawing.Color]::FromArgb(255, 250, 222, 195)
$skinBase = [System.Drawing.Color]::FromArgb(255, 253, 196, 159)
$skinShadow = [System.Drawing.Color]::FromArgb(255, 213, 139, 114)

function Is-Green([System.Drawing.Color]$p) {
    return ($p.G -gt 145 -and $p.R -lt 125 -and $p.B -lt 125)
}

# 1. right_hand_fist_slash_angle_1795675679106.jpg 로드 (좌우 반전 절대 없음!)
$raw = [System.Drawing.Bitmap]::FromFile("$brain\right_hand_fist_slash_angle_1795675679106.jpg")
$clean = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)

for ($y = 0; $y -lt 1024; $y++) {
    for ($x = 0; $x -lt 1024; $x++) {
        $p = $raw.GetPixel($x, $y)
        if (Is-Green $p) {
            $clean.SetPixel($x, $y, $pureGreen)
            continue
        }

        # (1) 위쪽 약간 오른쪽(12시 반 방향)의 맨살 손목 경계 마감을 가장 먼저 판정!
        #     손목 중심 (535, 285), 법선 n = (+0.16, -0.987) (위쪽 약간 오른쪽 방향)
        $wnx = 0.16; $wny = -0.987
        $wProj = ($x - 535.0) * $wnx + ($y - 285.0) * $wny
        $wPerp = -($x - 535.0) * $wny + ($y - 285.0) * $wnx
        $wLimit = 0.0 - 0.0006 * ($wPerp * $wPerp)
        if ($wProj -gt $wLimit) {
            $clean.SetPixel($x, $y, $pureGreen)
            continue
        }

        # (2) 왼쪽 위 팔목 스터브 제거: 손등 왼쪽 윤곽선 (y=270 일 때 x=385 -> y=510 일 때 x=322 -> y=820 일 때 x=418)
        $dyLeft = ($y - 510.0) / 280.0
        $leftMinX = 322.0 + 78.0 * ($dyLeft * $dyLeft)
        if ($x -lt $leftMinX) {
            $clean.SetPixel($x, $y, $pureGreen)
            continue
        }

        # 손목 경계와 손등 왼쪽 경계 외곽선(두께 21px) 및 손등 하이라이트 마감 (오른쪽 손가락 4개와 엄지 끝은 원본 그대로 100% 보존!)
        if ($wProj -ge ($wLimit - 21.0)) {
            $clean.SetPixel($x, $y, $darkLine)
            continue
        }
        if ($x -lt ($leftMinX + 21.0)) {
            $clean.SetPixel($x, $y, $darkLine)
            continue
        } elseif ($x -lt ($leftMinX + 44.0) -and $y -ge 300 -and $y -le 760) {
            $clean.SetPixel($x, $y, $skinHighlight)
            continue
        }

        $clean.SetPixel($x, $y, $p)
    }
}

# 정리된 오른손 바운딩 박스 측정
$hx0 = 9999; $hx1 = -1; $hy0 = 9999; $hy1 = -1
for ($y = 0; $y -lt 1024; $y++) {
    for ($x = 0; $x -lt 1024; $x++) {
        $p = $clean.GetPixel($x, $y)
        if (-not (Is-Green $p)) {
            if ($x -lt $hx0) { $hx0 = $x }
            if ($x -gt $hx1) { $hx1 = $x }
            if ($y -lt $hy0) { $hy0 = $y }
            if ($y -gt $hy1) { $hy1 = $y }
        }
    }
}
$hw = $hx1 - $hx0 + 1
$hh = $hy1 - $hy0 + 1
Write-Host ("Cleaned right hand BBox: [{0}..{1}, {2}..{3}] ({4}x{5})" -f $hx0, $hx1, $hy0, $hy1, $hw, $hh)

# 가로·세로 동일한 단일 균일 배율 하나로 옛 주먹 크기(약 69x68px)에 맞춤
$targetSize = 68.0
$scaleHand = [Math]::Round($targetSize / [Math]::Max($hw, $hh), 4)
$dw = [int][Math]::Round($hw * $scaleHand)
$dh = [int][Math]::Round($hh * $scaleHand)
Write-Host ("Uniform scale = {0} -> output size = {1}x{2}px" -f $scaleHand, $dw, $dh)

# sheet4_legs_weapons_v1.png (기존 4개 파츠 원본) 위에 5번째 파츠(맨 끝)로 배치
$s4Base = [System.Drawing.Bitmap]::FromFile((Join-Path $dir "sheet4_legs_weapons_v1.png"))
$s4Out = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g4 = [System.Drawing.Graphics]::FromImage($s4Out)
$g4.DrawImage($s4Base, 0, 0, 1024, 1024)
$g4.Dispose()
$s4Base.Dispose()

$dstCx = 522
$dstCy = 945
$dx0 = $dstCx - [int]($dw / 2)
$dy0 = $dstCy - [int]($dh / 2)

for ($dy = 0; $dy -lt $dh; $dy++) {
    $ty = $dy0 + $dy
    $sy = $hy0 + ($dy / $scaleHand)
    $iy = [int][Math]::Floor($sy); $fy = $sy - $iy
    for ($dx = 0; $dx -lt $dw; $dx++) {
        $tx = $dx0 + $dx
        $sx = $hx0 + ($dx / $scaleHand)
        $ix = [int][Math]::Floor($sx); $fx = $sx - $ix

        $rSum = 0.0; $gSum = 0.0; $bSum = 0.0; $wSum = 0.0
        for ($oy = 0; $oy -le 1; $oy++) {
            $wy = if ($oy -eq 0) { 1.0 - $fy } else { $fy }
            for ($ox = 0; $ox -le 1; $ox++) {
                $wx = if ($ox -eq 0) { 1.0 - $fx } else { $fx }
                $wt = $wx * $wy
                $px = [Math]::Min(1023, [Math]::Max(0, $ix + $ox))
                $py = [Math]::Min(1023, [Math]::Max(0, $iy + $oy))
                $p = $clean.GetPixel($px, $py)
                if (-not (Is-Green $p)) {
                    $pr = [double]$p.R; $pg = [double]$p.G; $pb = [double]$p.B
                    $maxRB = [Math]::Max($pr, $pb)
                    if ($pg -gt ($maxRB + 8)) { $pg = $maxRB }
                    $rSum += $pr * $wt; $gSum += $pg * $wt; $bSum += $pb * $wt
                    $wSum += $wt
                }
            }
        }
        if ($wSum -ge 0.45) {
            $rr = [int][Math]::Max(0, [Math]::Min(255, [Math]::Round($rSum / $wSum)))
            $gg = [int][Math]::Max(0, [Math]::Min(255, [Math]::Round($gSum / $wSum)))
            $bb = [int][Math]::Max(0, [Math]::Min(255, [Math]::Round($bSum / $wSum)))
            $s4Out.SetPixel($tx, $ty, [System.Drawing.Color]::FromArgb(255, $rr, $gg, $bb))
        }
    }
}

$s4Out.Save((Join-Path $dir "sheet4_legs_weapons.png"), [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host ("Saved sheet4_legs_weapons.png with 5th part at [{0}..{1}, {2}..{3}] ({4}x{5})" -f $dx0, ($dx0+$dw-1), $dy0, ($dy0+$dh-1), $dw, $dh)

# 시각 검증용 프리뷰 생성 (scratch/preview_req05_check.png)
$prev = New-Object System.Drawing.Bitmap(600, 300, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$gp = [System.Drawing.Graphics]::FromImage($prev)
$gp.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$rDst1 = New-Object System.Drawing.Rectangle(0, 0, 300, 300)
$rSrc1 = New-Object System.Drawing.Rectangle(([int]$dx0 - 20), ([int]$dy0 - 20), ([int]$dw + 40), ([int]$dh + 40))
$gp.DrawImage($s4Out, $rDst1, $rSrc1, [System.Drawing.GraphicsUnit]::Pixel)

$rest = [System.Drawing.Bitmap]::FromFile((Join-Path (Get-Location).Path "test\build\verify_liana\rest_pose.png"))
$restComp = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$gr = [System.Drawing.Graphics]::FromImage($restComp)
$gr.Clear([System.Drawing.Color]::White)
$gr.DrawImage($rest, 0, 0, 1024, 1024)
$gr.Dispose()

$fitScale = 0.76
$fw = [int][Math]::Round($dw * $fitScale)
$fh = [int][Math]::Round($dh * $fitScale)
$fx0 = 403 - [int]($fw / 2)
$fy0 = 676 - [int]($fh / 2)
for ($yy = 0; $yy -lt $fh; $yy++) {
    for ($xx = 0; $xx -lt $fw; $xx++) {
        $sx = $dx0 + [int][Math]::Floor($xx / $fitScale)
        $sy = $dy0 + [int][Math]::Floor($yy / $fitScale)
        $p = $s4Out.GetPixel($sx, $sy)
        if (-not (Is-Green $p)) {
            $restComp.SetPixel($fx0 + $xx, $fy0 + $yy, $p)
        }
    }
}
$rDst2 = New-Object System.Drawing.Rectangle(300, 0, 300, 300)
$rSrc2 = New-Object System.Drawing.Rectangle(310, 540, 220, 220)
$gp.DrawImage($restComp, $rDst2, $rSrc2, [System.Drawing.GraphicsUnit]::Pixel)
$gp.Dispose()

$prev.Save((Join-Path (Get-Location).Path "scratch\preview_req05_check.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$restComp.Dispose()
$rest.Dispose()
$prev.Dispose()
$clean.Dispose()
$raw.Dispose()
$s4Out.Dispose()
Write-Host "Preview saved to scratch/preview_req05_check.png"
