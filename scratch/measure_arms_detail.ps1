Add-Type -AssemblyName System.Drawing
$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

Write-Host "=== Near Arm (Screen Left, X: 340..475) exact bounds ==="
for ($y = 450; $y -le 685; $y += 10) {
    # Find outer left edge and inner right edge (before torso line at ~470)
    $leftEdge = -1
    for ($x = 340; $x -le 475; $x++) {
        $p = $bmp.GetPixel($x, $y)
        if (-not ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)) {
            $leftEdge = $x; break
        }
    }
    # Find inner edge (either green gap or dark line around 450..475)
    $rightEdge = -1
    if ($y -ge 510) {
        # Green gap exists between arm and torso
        for ($x = $leftEdge; $x -le 470; $x++) {
            $p = $bmp.GetPixel($x, $y)
            if ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100) {
                $rightEdge = $x - 1; break
            }
        }
    } else {
        # Above armpit (Y=450..505), look for dark inner line around 464..476
        for ($x = 478; $x -ge 445; $x--) {
            $p = $bmp.GetPixel($x, $y)
            $lum = ($p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11)
            if ($lum -lt 135) {
                $rightEdge = $x; break
            }
        }
    }
    $w = if ($rightEdge -gt $leftEdge -and $leftEdge -gt 0) { $rightEdge - $leftEdge } else { 0 }
    $cx = if ($w -gt 0) { [math]::Round(($leftEdge + $rightEdge) / 2) } else { 0 }
    Write-Host "Y=$y | Left=$leftEdge, Right=$rightEdge, Width=$w, Center=$cx"
}

Write-Host "`n=== Far Arm (Screen Right, X: 575..685) exact bounds ==="
for ($y = 450; $y -le 685; $y += 10) {
    # Find torso right edge (around 575..606) and far arm outer right edge
    $outerRight = -1
    for ($x = 685; $x -ge 575; $x--) {
        $p = $bmp.GetPixel($x, $y)
        if (-not ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)) {
            $outerRight = $x; break
        }
    }
    # Find inner left edge of far arm (or torso right boundary line)
    $innerLeft = -1
    if ($y -ge 580) {
        # Green gap exists between torso and far arm
        for ($x = $outerRight; $x -ge 585; $x--) {
            $p = $bmp.GetPixel($x, $y)
            if ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100) {
                $innerLeft = $x + 1; break
            }
        }
    } else {
        # Above Y=580, find torso's right contour line (around 575..593)
        for ($x = 572; $x -le 596; $x++) {
            $p = $bmp.GetPixel($x, $y)
            $lum = ($p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11)
            if ($lum -lt 135) {
                $innerLeft = $x; break
            }
        }
    }
    $w = if ($outerRight -gt $innerLeft -and $innerLeft -gt 0) { $outerRight - $innerLeft } else { 0 }
    $cx = if ($w -gt 0) { [math]::Round(($innerLeft + $outerRight) / 2) } else { 0 }
    Write-Host "Y=$y | TorsoRight/Inner=$innerLeft, OuterRight=$outerRight, VisibleWidth=$w, Center=$cx"
}

$bmp.Dispose()

