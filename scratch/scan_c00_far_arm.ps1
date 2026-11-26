Add-Type -AssemblyName System.Drawing

$c00 = [System.Drawing.Bitmap]::FromFile((Join-Path (Get-Location).Path "test\incoming\char_liana\c00_complete.png"))

Write-Host "=== c00_complete.png Far Upper Arm region (x=555..625, y=465..615) ==="
for ($y = 465; $y -le 615; $y += 4) {
    $line = ""
    for ($x = 555; $x -le 625; $x += 2) {
        $p = $c00.GetPixel($x, $y)
        $lum = 0.3*$p.R + 0.59*$p.G + 0.11*$p.B
        if ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120) { $line += "." }
        elseif ($lum -lt 95) { $line += "#" }
        elseif (($p.R - $p.B) -gt 35 -and $lum -lt 160) { $line += "W" } # wood shield / brown strap
        elseif ([Math]::Abs($p.R - $p.B) -le 15) { $line += "M" } # metal armor / shield rim
        elseif ($lum -ge 210) { $line += "L" } # lit cream sleeve
        else { $line += "S" } # shaded cream sleeve / skin
    }
    Write-Host ("y={0:D3}: {1}" -f $y, $line)
}
$c00.Dispose()
