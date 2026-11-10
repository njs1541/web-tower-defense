Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $bmp.Width; $h = $bmp.Height

$isChar = New-Object 'bool[,]' $w, $h
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $bmp.GetPixel($x, $y)
        $isChar[$x, $y] = -not ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
    }
}

Write-Host "=== Scanning Arm Inner Edge from inside the arm (X=410) to the right ==="
for ($y = 500; $y -le 570; $y += 5) {
    $found = 450
    for ($x = 410; $x -le 475; $x++) {
        if (-not $isChar[$x, $y]) { $found = $x - 1; break }
    }
    Write-Host ("Y={0}: Arm Inner Edge X = {1}" -f $y, $found)
}

$bmp.Dispose()

