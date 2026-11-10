Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$b05Path = Join-Path $root 'test\incoming\body_human\b05_arm_near_lower.png'
$bmp = [System.Drawing.Bitmap]::FromFile($b05Path)

Write-Host "=== b05 elbow joint area pixels (Y=540..565, X=390..430) ==="
for ($y = 542; $y -le 565; $y += 3) {
    $line = ""
    for ($x = 390; $x -le 430; $x += 3) {
        $p = $bmp.GetPixel($x, $y)
        if ($p.A -eq 0 -or ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)) {
            $line += " ............ "
        } else {
            $lum = [math]::Round($p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11)
            $line += ("[{0,3},{1,3},{2,3}]" -f $p.R, $p.G, $p.B)
        }
    }
    Write-Host ("Y={0}: {1}" -f $y, $line)
}
$bmp.Dispose()

