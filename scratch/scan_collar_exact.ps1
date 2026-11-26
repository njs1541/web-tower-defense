Add-Type -AssemblyName System.Drawing

$dir = Join-Path (Get-Location).Path "test\incoming\char_liana"
$s2 = [System.Drawing.Bitmap]::FromFile((Join-Path $dir "sheet2_body_v1.png"))

function Is-Green([System.Drawing.Color]$p) {
    return ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
}

Write-Host "=== Exact pixel scan of torso collar (x=240..320, y=144..202) ==="
for ($y = 144; $y -le 202; $y += 2) {
    $line = ""
    for ($x = 240; $x -le 320; $x++) {
        $p = $s2.GetPixel($x, $y)
        if (Is-Green $p) { $line += "." }
        else {
            $lum = 0.3*$p.R + 0.59*$p.G + 0.11*$p.B
            if ($lum -lt 105) { $line += "#" }
            elseif ($lum -lt 155) { $line += "+" }
            elseif (($p.R - $p.B) -gt 18) { $line += "C" }
            else { $line += "A" }
        }
    }
    Write-Host ("y={0:D3} (x=240..320): {1}" -f $y, $line)
}
$s2.Dispose()
