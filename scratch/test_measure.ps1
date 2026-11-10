Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$partsConfig = @(
  @{ id = "b06"; parent = "b02"; file = "b06_arm_far_upper.png";  pivot = @(580, 485) },
  @{ id = "b07"; parent = "b06"; file = "b07_arm_far_lower.png";  pivot = @(612, 565) },
  @{ id = "b09"; parent = "b03"; file = "b09_leg_far.png";        pivot = @(566, 680) },
  @{ id = "b08"; parent = "b03"; file = "b08_leg_near.png";       pivot = @(481, 680) },
  @{ id = "b03"; parent = $null; file = "b03_pelvis.png";         pivot = @(520, 650) },
  @{ id = "b02"; parent = "b03"; file = "b02_torso_upper.png";    pivot = @(520, 620) },
  @{ id = "b01"; parent = "b02"; file = "b01_head_base.png";      pivot = @(513, 395) },
  @{ id = "b04"; parent = "b02"; file = "b04_arm_near_upper.png"; pivot = @(451, 480) },
  @{ id = "b05"; parent = "b04"; file = "b05_arm_near_lower.png"; pivot = @(415, 565) }
)

$masks = @{}
foreach ($p in $partsConfig) {
    $bmp = [System.Drawing.Bitmap]::FromFile((Join-Path $root ("test\incoming\body_human\" + $p.file)))
    $w = $bmp.Width; $h = $bmp.Height
    $a = New-Object 'bool[,]' $w, $h
    [double]$sx = 0.0
    [double]$sy = 0.0
    [int]$n = 0
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $px = $bmp.GetPixel($x, $y)
            if ($px.A -gt 0 -and -not ($px.G -gt 150 -and $px.R -lt 100 -and $px.B -lt 100)) {
                $a[$x, $y] = $true; $sx += [double]$x; $sy += [double]$y; $n++
            }
        }
    }
    $cx = if ($n -gt 0) { $sx / $n } else { $w / 2.0 }
    $cy = if ($n -gt 0) { $sy / $n } else { $h / 2.0 }
    $masks[$p.id] = @{
        a = $a; w = $w; h = $h;
        centroid = @($cx, $cy)
    }
    $bmp.Dispose()
}

function IsOpaque($m, $x, $y) {
    $rx = [math]::Round($x); $ry = [math]::Round($y)
    if ($rx -lt 0 -or $ry -lt 0 -or $rx -ge $m.w -or $ry -ge $m.h) { return $false }
    return $m.a[$rx, $ry]
}

Write-Host "=== Joint Measurements ==="
foreach ($child in $partsConfig) {
    if (-not $child.parent) { continue }
    $J = $child.pivot
    $B = $masks[$child.id]
    $dx = $B.centroid[0] - $J[0]
    $dy = $B.centroid[1] - $J[1]
    $len = [math]::Sqrt($dx * $dx + $dy * $dy)
    if ($len -eq 0) { $len = 1.0 }
    $dx /= $len; $dy /= $len
    $nx = -$dy; $ny = $dx

    $filled = {
        param($t)
        foreach ($s in @(2, 4, 6, 8, 10)) {
            $x = $J[0] + $nx * $t + $dx * $s
            $y = $J[1] + $ny * $t + $dy * $s
            if (IsOpaque $B $x $y) { return $true }
        }
        return $false
    }

    $reach = {
        param($sign)
        $last = 0; $miss = 0
        for ($t = 1; $t -le 240; $t++) {
            if (& $filled ($sign * $t)) { $last = $t; $miss = 0 }
            elseif (++$miss -gt 3) { break }
        }
        return $last
    }

    $tPos = & $reach 1
    $tNeg = & $reach -1
    $width = $tPos + $tNeg
    $midX = [math]::Round($J[0] + $nx * ($tPos - $tNeg) / 2.0)
    $midY = [math]::Round($J[1] + $ny * ($tPos - $tNeg) / 2.0)

    Write-Host ("{0,-3} (parent {1,-3}): Pivot=[{2,3},{3,3}] -> Mid=[{4,3},{5,3}], Width={6,3}px (tPos={7,2}, tNeg={8,2})" -f `
        $child.id, $child.parent, $J[0], $J[1], $midX, $midY, $width, $tPos, $tNeg)
}
