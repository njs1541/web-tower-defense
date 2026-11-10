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

$torsoLeft = New-Object 'int[]' $h
for ($y = 440; $y -le 620; $y++) {
    if ($y -le 458) {
        $torsoLeft[$y] = 446
    } elseif ($y -le 508) {
        # 458: 446 -> 508: 460 (팔 뒤로 4~5px 오버랩)
        $t = ($y - 458.0) / (508.0 - 458.0)
        $torsoLeft[$y] = [math]::Round(446.0 * (1.0 - $t) + 460.0 * $t)
    } else {
        $found = 466
        for ($x = 500; $x -ge 430; $x--) {
            if (-not $isChar[$x, $y]) { $found = $x + 1; break }
        }
        $torsoLeft[$y] = $found
    }
}

$armInnerEdge = New-Object 'int[]' $h
for ($y = 440; $y -le 590; $y++) {
    if ($y -lt 475) {
        $armInnerEdge[$y] = [math]::Round(446 + ($y - 458) * 1.88)
    } elseif ($y -le 508) {
        $t = ($y - 475.0) / (508.0 - 475.0)
        $armInnerEdge[$y] = [math]::Round(478.0 * (1.0 - $t) + 464.0 * $t)
    } else {
        $found = 450
        for ($x = 430; $x -le 475; $x++) {
            if (-not $isChar[$x, $y]) { $found = $x - 1; break }
        }
        $armInnerEdge[$y] = $found
    }
}

$shX = 446.0; $shY = 458.0; $shR = 24.0

$leaks = 0
for ($y = 450; $y -le 560; $y++) {
    for ($x = 420; $x -le 500; $x++) {
        if (-not $isChar[$x, $y]) { continue }
        
        $inB02 = ($x -ge $torsoLeft[$y])

        $dx = $x - $shX; $dy = $y - $shY
        $isShoulderBall = (($dx * $dx + $dy * $dy) -le ($shR * $shR))
        $inB04 = $false
        if ($isShoulderBall) {
            $inB04 = $true
        } elseif ($x -le $armInnerEdge[$y]) {
            $inB04 = $true
        }

        if (-not $inB02 -and -not $inB04) {
            $leaks++
            Write-Host ("Leak at X={0}, Y={1}" -f $x, $y)
        }
    }
}

Write-Host ("Total coverage check: Leaks = {0}" -f $leaks)
$bmp.Dispose()
