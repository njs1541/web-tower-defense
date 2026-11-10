Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$outDir = Join-Path $root 'test\incoming\body_human'

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $srcBmp.Width
$h = $srcBmp.Height

# 크로마키 배경색: R=8, G=239, B=19
$bgColor = [System.Drawing.Color]::FromArgb(255, 8, 239, 19)

Write-Host "Analyzing pixel mask..."
$isChar = New-Object 'bool[,]' $w, $h
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $srcBmp.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        $isChar[$x, $y] = (-not $isGreen)
    }
}

# 라벨링
$label = New-Object 'int[,]' $w, $h

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        if (-not $isChar[$x, $y]) { continue }

        # --- A. 머리 (Head) ---
        if ($y -le 420) {
            $label[$x, $y] = 1
            continue
        }

        # --- B. 팔 (Arms) ---
        # 1) Far Arm: X < 445 부근
        $isFarArm = $false
        if ($x -le 445 -and $y -ge 460 -and $y -le 690) {
            if ($y -lt 510) {
                if ($x -lt (455 - ($y - 460) * 0.4)) { $isFarArm = $true }
            } else {
                if ($x -le 438) { $isFarArm = $true }
            }
        }
        if ($isFarArm) {
            if ($y -le 575) {
                $label[$x, $y] = 6 # FarArmUpper
            } else {
                $label[$x, $y] = 7 # FarArmLower
            }
            continue
        }

        # 2) Near Arm: X > 585 부근
        $isNearArm = $false
        if ($x -ge 585 -and $y -ge 465 -and $y -le 690) {
            if ($y -lt 575) {
                if ($x -gt (582 + ($y - 465) * 0.15)) { $isNearArm = $true }
            } else {
                if ($x -ge 590) { $isNearArm = $true }
            }
        }
        if ($isNearArm) {
            if ($y -le 575) {
                $label[$x, $y] = 4 # NearArmUpper
            } else {
                $label[$x, $y] = 5 # NearArmLower
            }
            continue
        }

        # --- C. 상체, 골반, 다리 ---
        if ($y -le 635) {
            $label[$x, $y] = 2 # Torso Upper
        } elseif ($y -le 700) {
            $label[$x, $y] = 3 # Pelvis
        } else {
            $legSplitX = 522 + ($y - 700) * 0.05
            if ($x -ge $legSplitX) {
                $label[$x, $y] = 8 # NearLeg
            } else {
                $label[$x, $y] = 9 # FarLeg
            }
        }
    }
}

Write-Host "Segmentation labeling complete."

function Export-Part-With-Overlap($fileName, $primaryId, $neighborJoints) {
    $outPath = Join-Path $outDir $fileName
    $partBmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($partBmp)
    $bgBrush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($bgBrush, 0, 0, $w, $h)
    $bgBrush.Dispose()
    $g.Dispose()

    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            if (-not $isChar[$x, $y]) { continue }

            $curLabel = $label[$x, $y]
            $include = ($curLabel -eq $primaryId)

            if (-not $include -and $neighborJoints) {
                foreach ($j in $neighborJoints) {
                    $jx = $j.x; $jy = $j.y; $r = $j.r
                    $dx = $x - $jx
                    $dy = $y - $jy
                    if (($dx * $dx + $dy * $dy) -le ($r * $r)) {
                        if ($j.targets -contains $curLabel) {
                            $include = $true
                            break
                        }
                    }
                }
            }

            if ($include) {
                $partBmp.SetPixel($x, $y, $srcBmp.GetPixel($x, $y))
            }
        }
    }

    $partBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $partBmp.Dispose()
    Write-Host "Created: $fileName"
}

# b01: 머리 (목 관절 513, 415 아래로 35px 목 오버랩)
Export-Part-With-Overlap "b01_head_base.png" 1 @(
    @{ x = 513; y = 415; r = 35; targets = @(2) }
)

# b02: 상체 (목 상단 30px, 허리 하단 35px, 양 어깨 볼 35px)
Export-Part-With-Overlap "b02_torso_upper.png" 2 @(
    @{ x = 513; y = 415; r = 30; targets = @(1) },
    @{ x = 512; y = 635; r = 35; targets = @(3) },
    @{ x = 426; y = 485; r = 35; targets = @(6) },
    @{ x = 596; y = 490; r = 35; targets = @(4) }
)

# b03: 골반 (허리 상단 30px, 양 고관절 하단 35px)
Export-Part-With-Overlap "b03_pelvis.png" 3 @(
    @{ x = 512; y = 635; r = 30; targets = @(2) },
    @{ x = 485; y = 705; r = 35; targets = @(9) },
    @{ x = 555; y = 705; r = 35; targets = @(8) }
)

# b04: 가까운 팔 위 (어깨 596,490 상단 35px, 팔꿈치 635,575 하단 35px)
Export-Part-With-Overlap "b04_arm_near_upper.png" 4 @(
    @{ x = 596; y = 490; r = 35; targets = @(2) },
    @{ x = 635; y = 575; r = 35; targets = @(5) }
)

# b05: 가까운 팔 아래 (팔꿈치 635,575 상단 35px)
Export-Part-With-Overlap "b05_arm_near_lower.png" 5 @(
    @{ x = 635; y = 575; r = 35; targets = @(4) }
)

# b06: 먼 팔 위 (어깨 426,485 상단 35px, 팔꿈치 385,575 하단 35px)
Export-Part-With-Overlap "b06_arm_far_upper.png" 6 @(
    @{ x = 426; y = 485; r = 35; targets = @(2) },
    @{ x = 385; y = 575; r = 35; targets = @(7) }
)

# b07: 먼 팔 아래 (팔꿈치 385,575 상단 35px)
Export-Part-With-Overlap "b07_arm_far_lower.png" 7 @(
    @{ x = 385; y = 575; r = 35; targets = @(6) }
)

# b08: 가까운 다리 (고관절 555,705 상단 35px)
Export-Part-With-Overlap "b08_leg_near.png" 8 @(
    @{ x = 555; y = 705; r = 35; targets = @(3) }
)

# b09: 먼 다리 (고관절 485,705 상단 35px)
Export-Part-With-Overlap "b09_leg_far.png" 9 @(
    @{ x = 485; y = 705; r = 35; targets = @(3) }
)

$srcBmp.Dispose()
Write-Host "All 9 parts sliced with natural overlapping textures!"
