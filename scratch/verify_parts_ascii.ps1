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

Show-Part-Map "b04_arm_near_upper.png" 380 480 450 595 2 6
Show-Part-Map "b05_arm_near_lower.png" 340 445 538 688 2 6
Show-Part-Map "b06_arm_far_upper.png"  548 642 452 592 2 6
Show-Part-Map "b07_arm_far_lower.png"  582 686 538 685 2 6

