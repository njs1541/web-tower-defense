Add-Type -AssemblyName System.Drawing

$brain = "C:\Users\NZIN\.gemini\antigravity\brain\a9b248b5-71cd-4fef-a353-af82a1fa0bb5"
$bmp = [System.Drawing.Bitmap]::FromFile("$brain\arm_far_upper_v3_1795654812958.jpg")
$w = $bmp.Width; $h = $bmp.Height

function Is-Green([System.Drawing.Color]$p) {
    return ($p.G -gt 145 -and $p.R -lt 125 -and $p.B -lt 125)
}

$minX = $w; $maxX = -1; $minY = $h; $maxY = -1
for ($y = 0; $y -lt $h; $y += 2) {
    for ($x = 0; $x -lt $w; $x += 2) {
        if (-not (Is-Green ($bmp.GetPixel($x, $y)))) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}
Write-Host ("arm_far_upper_v3 bbox: [{0}..{1}, {2}..{3}] size={4}x{5}" -f $minX, $maxX, $minY, $maxY, ($maxX-$minX+1), ($maxY-$minY+1))

for ($y = $minY; $y -le $maxY; $y += 25) {
    $line = ""
    for ($x = $minX; $x -le $maxX; $x += 15) {
        $p = $bmp.GetPixel($x, $y)
        if (Is-Green $p) { $line += "." }
        else {
            $lum = 0.3*$p.R + 0.59*$p.G + 0.11*$p.B
            if ($lum -lt 105) { $line += "#" }
            elseif ($lum -lt 195) { $line += "S" } # shaded cream
            else { $line += "L" } # lit cream
        }
    }
    Write-Host ("y={0:D3}: {1}" -f $y, $line)
}
$bmp.Dispose()
