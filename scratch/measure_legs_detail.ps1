Add-Type -AssemblyName System.Drawing
$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

Write-Host "=== Pelvis & Both Legs (Y: 620 to 960) ==="
for ($y = 620; $y -le 960; $y += 15) {
    # Near Leg (Screen Left, X: 420..526)
    $nlLeft = -1; $nlRight = -1
    for ($x = 420; $x -le 526; $x++) {
        $p = $bmp.GetPixel($x, $y)
        if (-not ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)) {
            if ($nlLeft -eq -1) { $nlLeft = $x }
            $nlRight = $x
        }
    }
    # Far Leg (Screen Right, X: 526..635)
    $flLeft = -1; $flRight = -1
    for ($x = 526; $x -le 635; $x++) {
        $p = $bmp.GetPixel($x, $y)
        if (-not ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)) {
            if ($flLeft -eq -1) { $flLeft = $x }
            $flRight = $x
        }
    }
    $nlW = if ($nlLeft -gt 0) { $nlRight - $nlLeft } else { 0 }
    $nlC = if ($nlW -gt 0) { [math]::Round(($nlLeft + $nlRight)/2) } else { 0 }
    $flW = if ($flLeft -gt 0) { $flRight - $flLeft } else { 0 }
    $flC = if ($flW -gt 0) { [math]::Round(($flLeft + $flRight)/2) } else { 0 }
    Write-Host "Y=$y | NearLeg(Left): $nlLeft..$nlRight (w=$nlW, c=$nlC) | FarLeg(Right): $flLeft..$flRight (w=$flW, c=$flC)"
}
$bmp.Dispose()

