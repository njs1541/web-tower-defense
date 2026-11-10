Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

Write-Host "=== Near Shoulder (Left) Scan Y=430..475, X=410..470 ==="
for ($y = 430; $y -le 475; $y += 3) {
    $line = ""
    for ($x = 410; $x -le 470; $x += 2) {
        $p = $bmp.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        $lum = $p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11
        if ($isGreen) { $line += "." }
        elseif ($lum -lt 130) { $line += "#" }
        else { $line += "+" }
    }
    Write-Host ("Y={0}: {1}" -f $y, $line)
}

Write-Host "`n=== Far Shoulder (Right) Scan Y=430..475, X=560..610 ==="
for ($y = 430; $y -le 475; $y += 3) {
    $line = ""
    for ($x = 560; $x -le 610; $x += 2) {
        $p = $bmp.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        $lum = $p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11
        if ($isGreen) { $line += "." }
        elseif ($lum -lt 130) { $line += "#" }
        else { $line += "+" }
    }
    Write-Host ("Y={0}: {1}" -f $y, $line)
}

$bmp.Dispose()

