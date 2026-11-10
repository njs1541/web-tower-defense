Add-Type -AssemblyName System.Drawing
$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

function Check-Pt($x, $y, $label) {
    $p = $bmp.GetPixel($x, $y)
    $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
    $status = if ($isGreen) { "GREEN (Background)" } else { "SKIN (Character)" }
    Write-Host "$label ($x,$y): $status [R=$($p.R),G=$($p.G),B=$($p.B)]"
}

Check-Pt 512 425 'Neck'
Check-Pt 450 490 'Far Shoulder'
Check-Pt 595 490 'Near Shoulder'
Check-Pt 410 580 'Far Elbow'
Check-Pt 615 580 'Near Elbow'
Check-Pt 512 660 'Waist'
Check-Pt 480 720 'Far Hip'
Check-Pt 560 720 'Near Hip'

$bmp.Dispose()

