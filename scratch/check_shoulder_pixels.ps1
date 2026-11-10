Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$b02Path = Join-Path $root 'test\incoming\body_human\b02_torso_upper.png'
$b04Path = Join-Path $root 'test\incoming\body_human\b04_arm_near_upper.png'
$b06Path = Join-Path $root 'test\incoming\body_human\b06_arm_far_upper.png'

$b02 = [System.Drawing.Bitmap]::FromFile($b02Path)
$b04 = [System.Drawing.Bitmap]::FromFile($b04Path)
$b06 = [System.Drawing.Bitmap]::FromFile($b06Path)

Write-Host "=== b02 Torso Upper: Left Shoulder Area (X=420..465, Y=435..475) ==="
for ($y = 435; $y -le 475; $y += 2) {
    $line = ""
    for ($x = 420; $x -le 465; $x += 2) {
        $p = $b02.GetPixel($x, $y)
        if ($p.A -eq 0 -or ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)) { $line += "." }
        else { $line += "#" }
    }
    Write-Host ("Y={0}: {1}" -f $y, $line)
}

Write-Host "`n=== b04 Arm Near Upper: Top Shoulder Area (X=420..465, Y=435..475) ==="
for ($y = 435; $y -le 475; $y += 2) {
    $line = ""
    for ($x = 420; $x -le 465; $x += 2) {
        $p = $b04.GetPixel($x, $y)
        if ($p.A -eq 0 -or ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)) { $line += "." }
        else { $line += "#" }
    }
    Write-Host ("Y={0}: {1}" -f $y, $line)
}

Write-Host "`n=== b02 Torso Upper: Right Shoulder/Neck Area (X=560..600, Y=435..475) ==="
for ($y = 435; $y -le 475; $y += 2) {
    $line = ""
    for ($x = 560; $x -le 600; $x += 2) {
        $p = $b02.GetPixel($x, $y)
        if ($p.A -eq 0 -or ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)) { $line += "." }
        else { $line += "#" }
    }
    Write-Host ("Y={0}: {1}" -f $y, $line)
}

Write-Host "`n=== b06 Arm Far Upper: Top Shoulder Area (X=560..600, Y=435..475) ==="
for ($y = 435; $y -le 475; $y += 2) {
    $line = ""
    for ($x = 560; $x -le 600; $x += 2) {
        $p = $b06.GetPixel($x, $y)
        if ($p.A -eq 0 -or ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)) { $line += "." }
        else { $line += "#" }
    }
    Write-Host ("Y={0}: {1}" -f $y, $line)
}

$b02.Dispose(); $b04.Dispose(); $b06.Dispose()

