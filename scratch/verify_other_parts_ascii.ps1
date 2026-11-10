Add-Type -AssemblyName System.Drawing
$root = (Get-Location).Path
$dir = Join-Path $root 'test\incoming\body_human'

function Show-Part-Map($file, $x1, $x2, $y1, $y2, $stepX, $stepY) {
    $bmp = [System.Drawing.Bitmap]::FromFile((Join-Path $dir $file))
    Write-Host "=== $file ($x1..$x2, $y1..$y2) ==="
    for ($y = $y1; $y -le $y2; $y += $stepY) {
        $line = $y.ToString().PadLeft(3) + " "
        for ($x = $x1; $x -le $x2; $x += $stepX) {
            $p = $bmp.GetPixel($x, $y)
            $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
            if ($isGreen) { $line += "." }
            else {
                $lum = ($p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11)
                if ($lum -lt 135) { $line += "#" }
                elseif ($lum -lt 200) { $line += "=" }
                else { $line += "+" }
            }
        }
        Write-Host $line
    }
    $bmp.Dispose()
}

Show-Part-Map "b01_head_base.png"   370 640 340 420 4 6
Show-Part-Map "b02_torso_upper.png" 430 615 370 660 3 10
Show-Part-Map "b03_pelvis.png"      430 615 595 705 3 6
Show-Part-Map "b08_leg_near.png"    420 530 630 750 2 8
Show-Part-Map "b09_leg_far.png"     520 630 630 750 2 8

