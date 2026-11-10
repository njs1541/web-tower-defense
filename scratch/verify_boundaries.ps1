Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $bmp.Width; $h = $bmp.Height

$isChar = New-Object 'bool[,]' $w, $h
$lumMap = New-Object 'double[,]' $w, $h
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $bmp.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        $isChar[$x, $y] = -not $isGreen
        $lumMap[$x, $y] = if (-not $isGreen) { $p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11 } else { 999.0 }
    }
}

# 1. torsoLeft 모델링
$torsoLeft = New-Object 'int[]' $h
for ($y = 440; $y -le 620; $y++) {
    if ($y -lt 475) {
        $torsoLeft[$y] = 444
    } elseif ($y -le 507) {
        $torsoLeft[$y] = [math]::Round(444 + ($y - 475) * 0.68)
    } else {
        $found = 466
        for ($x = 500; $x -ge 430; $x--) {
            if (-not $isChar[$x, $y]) { $found = $x + 1; break }
        }
        $torsoLeft[$y] = $found
    }
}

# 2. nearArmRight 모델링
$nearArmRight = New-Object 'int[]' $h
for ($y = 440; $y -le 690; $y++) {
    if ($y -lt 475) {
        $nearArmRight[$y] = 446
    } elseif ($y -le 507) {
        $nearArmRight[$y] = [math]::Round(450 + ($y - 475) * 0.6)
    } elseif ($y -le 645) {
        $found = 445
        for ($x = 380; $x -le 475; $x++) {
            if (-not $isChar[$x, $y]) { $found = $x - 1; break }
        }
        $nearArmRight[$y] = $found
    } else {
        $nearArmRight[$y] = 410
    }
}

Write-Host "=== Validation of torsoLeft and nearArmRight ==="
for ($y = 460; $y -le 560; $y += 10) {
    Write-Host ("Y={0,3}: nearArmRight={1,3}, torsoLeft={2,3}" -f $y, $nearArmRight[$y], $torsoLeft[$y])
}

$bmp.Dispose()

