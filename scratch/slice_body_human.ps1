Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$outDir = Join-Path $root 'test\incoming\body_human'

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $srcBmp.Width
$h = $srcBmp.Height

# 크로마키 배경색: R=8, G=239, B=19
$bgR = 8; $bgG = 239; $bgB = 19
$bgColor = [System.Drawing.Color]::FromArgb(255, $bgR, $bgG, $bgB)

# 1. 픽셀별 캐릭터 여부 판정 맵 (2D Array)
Write-Host "Analyzing pixel mask..."
$isChar = New-Object 'bool[,]' $w, $h
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $srcBmp.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        $isChar[$x, $y] = (-not $isGreen)
    }
}

# 2. 관절 중심점 및 주요 경계선 정의
# Neck: Y ≈ 425
# Waist: Y ≈ 655
# Elbows: Y ≈ 575
# Hips: Y ≈ 720
# Arm separation X: Far arm (X < 445), Torso (445 <= X <= 590), Near arm (X > 590)
# Leg separation X: Far leg (X < 515), Near leg (X >= 515)

# 헬퍼 함수: 단일 파츠 저장
function Create-Part($fileName, [ScriptBlock]$filterBlock, [ScriptBlock]$extensionBlock = $null) {
    $outPath = Join-Path $outDir $fileName
    $partBmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($partBmp)
    $bgBrush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($bgBrush, 0, 0, $w, $h)
    $bgBrush.Dispose()
    $g.Dispose()

    # 픽셀 복사
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            if ($isChar[$x, $y]) {
                $include = & $filterBlock $x $y
                if ($include) {
                    $partBmp.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
                }
            }
        }
    }

    # 관절 오버랩 추가 그리기 (익스텐션 블록이 있는 경우)
    if ($extensionBlock) {
        $gExt = [System.Drawing.Graphics]::FromImage($partBmp)
        $gExt.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        & $extensionBlock $gExt
        $gExt.Dispose()
    }

    # 저장
    $partBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $partBmp.Dispose()
    Write-Host "Created: $fileName"
}

# 피부색 브러시 (관절 오버랩 캡용: 대표 피부색 R:252, G:215, B:198)
$skinColor = [System.Drawing.Color]::FromArgb(255, 252, 215, 198)
$skinBrush = New-Object System.Drawing.SolidBrush($skinColor)

# =========================================================================
# b01: 머리 (b01_head_base.png)
# 얼굴 피부와 귀, 턱 아래 목 윗부분.
# =========================================================================
Create-Part "b01_head_base.png" `
    -filterBlock {
        param($x, $y)
        # Y <= 435 (턱 끝 및 목 윗부분)
        return ($y -le 435)
    } `
    -extensionBlock {
        param($g)
        # 목 관절 아래로 30px 둥글게 연장 (목 중심: X=512, Y=430 부근, 폭 45, 높이 30)
        $g.FillEllipse($skinBrush, 490, 420, 44, 30)
    }

# =========================================================================
# b02: 상체 (b02_torso_upper.png)
# 목 ~ 허리. 어깨 관절까지 (팔 제외)
# =========================================================================
Create-Part "b02_torso_upper.png" `
    -filterBlock {
        param($x, $y)
        # Y: 420 ~ 660, X: 440 ~ 600
        # 양팔 영역 제외 (Y > 510에서 X < 445는 Far arm, X > 595는 Near arm)
        if ($y -lt 420 -or $y -gt 660) { return $false }
        if ($y -ge 510) {
            if ($x -lt 448 -or $x -gt 598) { return $false }
        }
        return $true
    } `
    -extensionBlock {
        param($g)
        # 목 조인트 위로 30px (목 내부 겹침)
        $g.FillEllipse($skinBrush, 490, 405, 44, 30)
        # 허리 조인트 아래로 30px (골반과 겹침, Y=650~680)
        $g.FillEllipse($skinBrush, 450, 645, 125, 30)
        # 먼 어깨 볼 (X=448, Y=490)
        $g.FillEllipse($skinBrush, 430, 475, 36, 36)
        # 가까운 어깨 볼 (X=595, Y=490)
        $g.FillEllipse($skinBrush, 580, 475, 36, 36)
    }

# =========================================================================
# b03: 골반 (b03_pelvis.png)
# 허리 ~ 고관절 (Y: 645 ~ 730)
# =========================================================================
Create-Part "b03_pelvis.png" `
    -filterBlock {
        param($x, $y)
        return ($y -ge 645 -and $y -le 730)
    } `
    -extensionBlock {
        param($g)
        # 허리 위로 25px 겹침
        $g.FillEllipse($skinBrush, 450, 635, 125, 25)
        # 먼 고관절 아래로 30px 겹침 (X=475, Y=715)
        $g.FillEllipse($skinBrush, 450, 715, 55, 30)
        # 가까운 고관절 아래로 30px 겹침 (X=560, Y=715)
        $g.FillEllipse($skinBrush, 535, 715, 55, 30)
    }

# =========================================================================
# b04: 가까운 팔 위 (b04_arm_near_upper.png)
# 어깨 ~ 팔꿈치 (오른팔 상단: X >= 585, Y: 460 ~ 590)
# =========================================================================
Create-Part "b04_arm_near_upper.png" `
    -filterBlock {
        param($x, $y)
        return ($x -ge 585 -and $y -ge 460 -and $y -le 590)
    } `
    -extensionBlock {
        param($g)
        # 어깨 위 둥근 관절 캡 (X=590, Y=460)
        $g.FillEllipse($skinBrush, 580, 455, 35, 35)
        # 팔꿈치 아래 둥근 관절 캡 (X=610, Y=580)
        $g.FillEllipse($skinBrush, 600, 575, 45, 35)
    }

# =========================================================================
# b05: 가까운 팔 아래 (b05_arm_near_lower.png)
# 팔꿈치 ~ 손끝 (오른팔 하단: X >= 585, Y: 565 ~ 690)
# =========================================================================
Create-Part "b05_arm_near_lower.png" `
    -filterBlock {
        param($x, $y)
        return ($x -ge 585 -and $y -ge 565 -and $y -le 690)
    } `
    -extensionBlock {
        param($g)
        # 팔꿈치 위 둥근 관절 캡 (Y=560 부근)
        $g.FillEllipse($skinBrush, 595, 555, 45, 30)
    }

# =========================================================================
# b06: 먼 팔 위 (b06_arm_far_upper.png)
# 어깨 ~ 팔꿈치 (왼팔 상단: X <= 455, Y: 460 ~ 590)
# =========================================================================
Create-Part "b06_arm_far_upper.png" `
    -filterBlock {
        param($x, $y)
        return ($x -le 455 -and $y -ge 460 -and $y -le 590)
    } `
    -extensionBlock {
        param($g)
        # 어깨 위 둥근 관절 캡 (X=430, Y=460)
        $g.FillEllipse($skinBrush, 420, 455, 35, 35)
        # 팔꿈치 아래 둥근 관절 캡 (X=395, Y=580)
        $g.FillEllipse($skinBrush, 385, 575, 45, 35)
    }

# =========================================================================
# b07: 먼 팔 아래 (b07_arm_far_lower.png)
# 팔꿈치 ~ 손끝 (왼팔 하단: X <= 455, Y: 565 ~ 690)
# =========================================================================
Create-Part "b07_arm_far_lower.png" `
    -filterBlock {
        param($x, $y)
        return ($x -le 455 -and $y -ge 565 -and $y -le 690)
    } `
    -extensionBlock {
        param($g)
        # 팔꿈치 위 둥근 관절 캡 (Y=560 부근)
        $g.FillEllipse($skinBrush, 385, 555, 45, 30)
    }

# =========================================================================
# b08: 가까운 다리 (b08_leg_near.png)
# 고관절 ~ 발끝 (오른다리: X >= 515, Y >= 710)
# =========================================================================
Create-Part "b08_leg_near.png" `
    -filterBlock {
        param($x, $y)
        return ($x -ge 515 -and $y -ge 710)
    } `
    -extensionBlock {
        param($g)
        # 고관절 위로 30px 둥근 관절 캡 (X=540, Y=695)
        $g.FillEllipse($skinBrush, 530, 695, 55, 35)
    }

# =========================================================================
# b09: 먼 다리 (b09_leg_far.png)
# 고관절 ~ 발끝 (왼다리: X < 525, Y >= 710)
# =========================================================================
Create-Part "b09_leg_far.png" `
    -filterBlock {
        param($x, $y)
        return ($x -lt 525 -and $y -ge 710)
    } `
    -extensionBlock {
        param($g)
        # 고관절 위로 30px 둥근 관절 캡 (X=450, Y=695)
        $g.FillEllipse($skinBrush, 445, 695, 55, 35)
    }

$skinBrush.Dispose()
$srcBmp.Dispose()
Write-Host "All 9 body parts created successfully in $outDir!"

