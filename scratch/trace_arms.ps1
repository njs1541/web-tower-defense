Add-Type -AssemblyName System.Drawing
$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

# 팔(좌/우)의 궤적 추적: Y=480~690에서 좌측팔(Far)과 우측팔(Near)의 중심점과 두께
Write-Host "Y    | Far Arm (X range, center, w) | Near Arm (X range, center, w)"
for ($y = 480; $y -le 680; $y += 10) {
    # Far arm: x < 450
    $minFar = 1000; $maxFar = 0; $cntFar = 0
    # Near arm: x > 590
    $minNear = 1000; $maxNear = 0; $cntNear = 0
    
    for ($x = 340; $x -le 460; $x++) {
        $p = $bmp.GetPixel($x, $y)
        if (-not ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)) {
            if ($x -lt $minFar) { $minFar = $x }
            if ($x -gt $maxFar) { $maxFar = $x }
            $cntFar++
        }
    }
    for ($x = 590; $x -le 690; $x++) {
        $p = $bmp.GetPixel($x, $y)
        if (-not ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)) {
            if ($x -lt $minNear) { $minNear = $x }
            if ($x -gt $maxNear) { $maxNear = $x }
            $cntNear++
        }
    }
    $strFar = if ($cntFar -gt 0) { "$minFar-$maxFar (w=$cntFar)" } else { "none" }
    $strNear = if ($cntNear -gt 0) { "$minNear-$maxNear (w=$cntNear)" } else { "none" }
    Write-Host ("Y=" + $y.ToString().PadLeft(3) + " | Far: " + $strFar.PadRight(18) + " | Near: " + $strNear)
}

$bmp.Dispose()

