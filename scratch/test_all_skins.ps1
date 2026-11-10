Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$parts = @('b01_head_base.png', 'b02_torso_upper.png', 'b03_pelvis.png', 'b04_arm_near_upper.png', 'b05_arm_near_lower.png', 'b06_arm_far_upper.png', 'b07_arm_far_lower.png', 'b08_leg_near.png', 'b09_leg_far.png')

foreach ($f in $parts) {
    $pPath = Join-Path $root ("test\incoming\body_human\" + $f)
    $bmp = [System.Drawing.Bitmap]::FromFile($pPath)
    $skinR = 0; $skinG = 0; $skinB = 0; $count = 0
    for ($y = 0; $y -lt $bmp.Height; $y += 5) {
        for ($x = 0; $x -lt $bmp.Width; $x += 5) {
            $p = $bmp.GetPixel($x, $y)
            if ($p.A -gt 200 -and -not ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)) {
                $lum = $p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11
                if ($lum -gt 150 -and $p.R -gt $p.G -and $p.G -ge $p.B) {
                    $skinR += $p.R; $skinG += $p.G; $skinB += $p.B; $count++
                }
            }
        }
    }
    if ($count -gt 0) {
        $avgR = [math]::Round($skinR / $count)
        $avgG = [math]::Round($skinG / $count)
        $avgB = [math]::Round($skinB / $count)
        Write-Host ("{0,-25} : Avg Skin = rgb({1,3},{2,3},{3,3}), Samples={4}" -f $f, $avgR, $avgG, $avgB, $count)
    }
    $bmp.Dispose()
}

