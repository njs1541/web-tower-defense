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

# ==============================================================================
# 1. [수정 1] sheet3_arms.png 의 가까운 아래팔 (arm_near_lower)
# - 손목에서 끝내고 주먹은 그리지 않음
# - 손목 끝은 둥근 돔으로 마감하고 30-40px 더 그림 (손 밑으로 들어가는 겹침 여백, 단면 외곽선 없음)
# - 위 끝(소매 속으로 들어가는 둥근 돔)과 팔 모양은 지금 그대로 둠
# - 나머지 3개 파츠(가까운 위팔, 먼 위팔, 먼 아래팔)는 픽셀 100% 그대로 유지
# ==============================================================================
Write-Host "1. Updating sheet3_arms.png (arm_near_lower wrist dome)..."
$s3Src = [System.Drawing.Bitmap]::FromFile((Join-Path $dir "sheet3_arms_v2.png"))
$s3Out = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g3 = [System.Drawing.Graphics]::FromImage($s3Out)
$g3.DrawImage($s3Src, 0, 0, 1024, 1024)
$g3.Dispose()

# 아래팔 중심축 단위벡터 u = (-0.485, 0.8745), 수직 단위벡터 v = (0.8745, 0.485)
# 엄지 굴곡 시작 직전의 직선 아래팔 단면 P0 = (740.5, 260.0) 에서 매끄럽게 이어 손목 너머 35px 둥근 돔으로 마감
$ux = -0.4850; $uy = 0.8745
$vx = 0.8745;  $vy = 0.4850
$p0x = 740.5;  $p0y = 260.0
$radius = 25.8
$cylLen = 19.0 # P0(y=260)에서 손목 경계(y=272)까지 12px + 손목 너머 직선/반원 돔 35px (30-40px 규격)

for ($y = 248; $y -le 350; $y++) {
    for ($x = 670; $x -le 780; $x++) {
        $dx = $x - $p0x
        $dy = $y - $p0y
        $proj = $dx * $ux + $dy * $uy
        $perp = $dx * $vx + $dy * $vy

        if ($proj -gt 0.0) {
            # 약간의 테이퍼링(손목 쪽으로 갈수록 반지름 25.8 -> 24.2로 자연스럽게 좁아짐)
            $curR = $radius - 0.08 * [Math]::Min($proj, $cylLen)
            if ($proj -le $cylLen) {
                if ([Math]::Abs($perp) -le $curR) {
                    if ([Math]::Abs($perp) -ge ($curR - 2.8)) {
                        $s3Out.SetPixel($x, $y, $darkLine)
                    } elseif ($perp -lt -17.0) {
                        $s3Out.SetPixel($x, $y, $skinHighlight)
                    } elseif ($perp -gt 12.0) {
                        $s3Out.SetPixel($x, $y, $skinShadow)
                    } else {
                        $s3Out.SetPixel($x, $y, $skinBase)
                    }
                } else {
                    $s3Out.SetPixel($x, $y, $pureGreen)
                }
            } else {
                # 반원형 둥근 돔 구간 (단면 외곽선 없음!)
                $domeR = $radius - 0.08 * $cylLen
                $dProj = $proj - $cylLen
                $distSq = ($dProj * $dProj) + ($perp * $perp)
                if ($distSq -le ($domeR * $domeR)) {
                    if ($perp -lt -17.0) {
                        $s3Out.SetPixel($x, $y, $skinHighlight)
                    } elseif ($perp -gt 12.0) {
                        $s3Out.SetPixel($x, $y, $skinShadow)
                    } else {
                        $s3Out.SetPixel($x, $y, $skinBase)
                    }
                } else {
                    $s3Out.SetPixel($x, $y, $pureGreen)
                }
            }
        }
    }
}

$s3Out.Save((Join-Path $dir "sheet3_arms.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$s3Src.Dispose()

# ==============================================================================
# 2. [수정 2] sheet4_legs_weapons.png 에 "가까운 손" 추가
# - 칼 손잡이를 감싸 쥔 오른손 주먹 하나 (칼날이 위로 향한 쥐는 모양: 엄지·검지가 위/가드 쪽, 새끼손가락이 아래/폼멜 쪽)
# - 칼은 그리지 않고 손가락 사이로 손잡이가 지나갈 자리는 비워 둠
# - 손목 쪽은 맨살 손목 경계에서 외곽선으로 닫음
# - 크기는 기존 아래팔에 그려진 주먹(약 69x68px)과 같게 단일 균일 배율(scale = 0.135)로 맞춤
# - 시트 안 배치: 가까운 다리 → 먼 다리 → 주무기 → 보조무기 → 가까운 손(맨 끝, 하단 중앙 (522, 936))
# ==============================================================================
Write-Host "2. Preparing hand_cap and updating sheet4_legs_weapons.png..."
$handRaw = [System.Drawing.Bitmap]::FromFile("$brain\liana_right_hand_fist_final_1795662854806.jpg")
$handClean = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)

# 손목 절단선: 왼쪽 위 손목 스터브를 손목 경계선에서 자르고 어두운 외곽선으로 닫는다.
# 손목 경계 법선 방향 (왼쪽 위 방향): n = (-0.82, -0.57)
$wnx = -0.82; $wny = -0.57
$wcx = 365.0; $wcy = 415.0

for ($y = 0; $y -lt 1024; $y++) {
    for ($x = 0; $x -lt 1024; $x++) {
        $p = $handRaw.GetPixel($x, $y)
        if (Is-Green $p) {
            $handClean.SetPixel($x, $y, $pureGreen)
            continue
        }

        # (1) 왼쪽 아래 손잡이 통과 홈(폼멜 쪽, x=345..450, y=545..715)의 잔여 외곽선 브리지 완전 개방
        # 홈 중심선 (370, 650) -> (445, 575) 주변의 삼각형 포켓 바깥 브리지를 완전히 비워 내부에 갇힌 초록 점 제거
        if ($x -ge 345 -and $x -le 445 -and $y -ge 555 -and $y -le 710) {
            # 손바닥 아래 경계: x + y = 985, 새끼손가락 왼쪽 경계: x - 0.15*(y - 600) = 408
            if (($x + $y) -ge 982 -and $x -lt (407.0 + 0.22 * ($y - 600.0))) {
                $handClean.SetPixel($x, $y, $pureGreen)
                continue
            }
        }

        # (2) 오른쪽 위 손잡이 통과 홈(가드 쪽, 엄지(640,390)와 검지(700,430) 사이)을 더 또렷하게 비워 손잡이가 지나갈 자리 확보
        $dxGuard = $x - 675.0
        $dyGuard = $y - 385.0
        if (($dxGuard * $dxGuard + $dyGuard * $dyGuard) -le (28.0 * 28.0)) {
            $handClean.SetPixel($x, $y, $pureGreen)
            continue
        }
        if (($dxGuard * $dxGuard + $dyGuard * $dyGuard) -le (42.0 * 42.0)) {
            $handClean.SetPixel($x, $y, $darkLine)
            continue
        }

        # (3) 왼쪽 위 손목 경계 마감 (소매 없는 맨살 손목 경계에서 외곽선으로 닫음)
        $dxW = $x - $wcx
        $dyW = $y - $wcy
        $wProj = $dxW * $wnx + $dyW * $wny
        $wPerp = -$dxW * $wny + $dyW * $wnx
        # 살짝 둥근 손목 경계 곡선
        $wLimit = 18.0 - 0.0008 * ($wPerp * $wPerp)
        if ($wProj -gt $wLimit) {
            $handClean.SetPixel($x, $y, $pureGreen)
            continue
        } elseif ($wProj -ge ($wLimit - 18.0)) {
            $handClean.SetPixel($x, $y, $darkLine)
            continue
        }

        $handClean.SetPixel($x, $y, $p)
    }
}

# 정리된 손 파츠의 바운딩 박스 측정
$hx0 = 9999; $hx1 = -1; $hy0 = 9999; $hy1 = -1
for ($y = 0; $y -lt 1024; $y++) {
    for ($x = 0; $x -lt 1024; $x++) {
        $p = $handClean.GetPixel($x, $y)
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
Write-Host ("Cleaned hand source BBox: [{0}..{1}, {2}..{3}] ({4}x{5})" -f $hx0, $hx1, $hy0, $hy1, $hw, $hh)

# 단일 균일 배율 scaleHand = 0.135 (508x505 -> 69x68px, 기존 아래팔의 주먹 69x68px과 동일 크기!)
$scaleHand = 0.135
$dw = [int][Math]::Round($hw * $scaleHand)
$dh = [int][Math]::Round($hh * $scaleHand)

$s4Src = [System.Drawing.Bitmap]::FromFile((Join-Path $dir "sheet4_legs_weapons_v1.png"))
$s4Out = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g4 = [System.Drawing.Graphics]::FromImage($s4Out)
$g4.DrawImage($s4Src, 0, 0, 1024, 1024)
$g4.Dispose()
$s4Src.Dispose()

# 시트 4의 맨 끝(3행 중앙: center = (522, 945))에 배치
# Row 2의 weapon_main(y=598..872), weapon_sub(y=591..879)와 수직으로 완전히 분리(y0 = 911 > 879)되고
# 두 무기와의 실제 픽셀 간격도 110px 이상 확보되어 읽는 순서 5번째(맨 끝)로 100% 인식됨
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
                $p = $handClean.GetPixel($px, $py)
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
Write-Host ("Placed hand_cap on sheet4_legs_weapons.png at [{0}..{1}, {2}..{3}] ({4}x{5})" -f $dx0, ($dx0+$dw-1), $dy0, ($dy0+$dh-1), $dw, $dh)

# ==============================================================================
# 3. 시각 확인용 확대 프리뷰 (scratch/preview_req04_hands.png)
# - 왼쪽: 수정된 가까운 아래팔 (손목 둥근 돔, 단면 외곽선 없음)
# - 오른쪽: 새로 추가된 가까운 손 (칼날 위 방향 쥔 오른손 주먹, 손목 외곽선 마감, 손잡이 통과 홈)
# ==============================================================================
$prev = New-Object System.Drawing.Bitmap(600, 300, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$gp = [System.Drawing.Graphics]::FromImage($prev)
$gp.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$rDst1 = New-Object System.Drawing.Rectangle(0, 0, 300, 300)
$rSrc1 = New-Object System.Drawing.Rectangle(650, 150, 180, 180)
$rDst2 = New-Object System.Drawing.Rectangle(300, 0, 300, 300)
$rSrc2 = New-Object System.Drawing.Rectangle(([int]$dx0 - 20), ([int]$dy0 - 20), ([int]$dw + 40), ([int]$dh + 40))
$gp.DrawImage($s3Out, $rDst1, $rSrc1, [System.Drawing.GraphicsUnit]::Pixel)
$gp.DrawImage($s4Out, $rDst2, $rSrc2, [System.Drawing.GraphicsUnit]::Pixel)
$gp.Dispose()
$prev.Save((Join-Path (Get-Location).Path "scratch\preview_req04_hands.png"), [System.Drawing.Imaging.ImageFormat]::Png)

$prev.Dispose()
$handClean.Dispose()
$handRaw.Dispose()
$s3Out.Dispose()
$s4Out.Dispose()
Write-Host "Done!"
