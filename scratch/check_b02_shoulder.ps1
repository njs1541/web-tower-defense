Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$b02Path = Join-Path $root 'test\incoming\body_human\b02_torso_upper.png'
$bmp = [System.Drawing.Bitmap]::FromFile($b02Path)

Write-Host "=== b02 shoulder area pixels (X=425..470, Y=455..490) ==="
for ($y = 455; $y -le 490; $y += 3) {
    $line = ""
    for ($x = 425; $x -le 470; $x += 3) {
        $p = $bmp.GetPixel($x, $y)
        if ($p.A -eq 0 -or ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)) {
            $line += " ."
        } else {
            $line += " #"
        }
    }
    Write-Host ("Y={0}: {1}" -f $y, $line)
}
$bmp.Dispose()

