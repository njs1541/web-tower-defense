Add-Type -AssemblyName System.Drawing

$dir = Join-Path (Get-Location).Path "test\incoming\char_liana"
$s2 = [System.Drawing.Bitmap]::FromFile((Join-Path $dir "sheet2_body_v1.png"))
$s3 = [System.Drawing.Bitmap]::FromFile((Join-Path $dir "sheet3_arms_v1.png"))
$c00 = [System.Drawing.Bitmap]::FromFile((Join-Path $dir "c00_complete.png"))

function Is-Green([System.Drawing.Color]$p) {
    return ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
}

# 1. sheet2_body_v1.png의 3개 파츠 바운딩 박스 확인
Write-Host "=== sheet2_body_v1.png boxes ==="
foreach ($region in @(
    @{ name="torso"; x0=100; y0=80; x1=460; y1=460 },
    @{ name="pelvis"; x0=550; y0=100; x1=920; y1=450 },
    @{ name="skirt_back"; x0=300; y0=550; x1=720; y1=920 }
)) {
    $minX = 1024; $maxX = -1; $minY = 1024; $maxY = -1
    for ($y = $region.y0; $y -le $region.y1; $y++) {
        for ($x = $region.x0; $x -le $region.x1; $x++) {
            if (-not (Is-Green ($s2.GetPixel($x, $y)))) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    Write-Host ("  {0}: [{1}..{2}, {3}..{4}] ({5}x{6})" -f $region.name, $minX, $maxX, $minY, $maxY, ($maxX-$minX+1), ($maxY-$minY+1))
}

# 2. sheet3_arms_v1.png의 4개 파츠 바운딩 박스 확인
Write-Host "=== sheet3_arms_v1.png boxes ==="
foreach ($region in @(
    @{ name="arm_near_upper"; x0=100; y0=80; x1=460; y1=460 },
    @{ name="arm_near_lower"; x0=550; y0=80; x1=920; y1=460 },
    @{ name="arm_far_upper";  x0=100; y0=540; x1=460; y1=920 },
    @{ name="arm_far_lower";  x0=550; y0=540; x1=920; y1=920 }
)) {
    $minX = 1024; $maxX = -1; $minY = 1024; $maxY = -1
    for ($y = $region.y0; $y -le $region.y1; $y++) {
        for ($x = $region.x0; $x -le $region.x1; $x++) {
            if (-not (Is-Green ($s3.GetPixel($x, $y)))) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    Write-Host ("  {0}: [{1}..{2}, {3}..{4}] ({5}x{6})" -f $region.name, $minX, $maxX, $minY, $maxY, ($maxX-$minX+1), ($maxY-$minY+1))
}

$s2.Dispose(); $s3.Dispose(); $c00.Dispose()
