Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $bmp.Width; $h = $bmp.Height
$bgColor = [System.Drawing.Color]::FromArgb(255, 8, 239, 19)

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
        $torsoLeft[$y] = [math]::Round(446 + ($y - 458) * 0.40)
    } else {
        $found = 466
        for ($x = 500; $x -ge 430; $x--) {
            if (-not $isChar[$x, $y]) { $found = $x + 1; break }
        }
        $torsoLeft[$y] = $found
    }
}

$b02Test = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($b02Test)
$brush = New-Object System.Drawing.SolidBrush($bgColor)
$g.FillRectangle($brush, 0, 0, $w, $h)
$brush.Dispose()
$g.Dispose()

for ($y = 450; $y -le 560; $y++) {
    $left = $torsoLeft[$y]
    for ($x = $left; $x -le 510; $x++) {
        if ($y -le 508) {
            if ($x -le ($left + 1)) {
                # 경계선 소프트 라인
                $b02Test.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, 195, 145, 135))
            } elseif ($x -le 478) {
                # 깨끗한 피부 클로닝
                $b02Test.SetPixel($x, $y, $bmp.GetPixel(488, $y))
            } else {
                $b02Test.SetPixel($x, $y, $bmp.GetPixel($x, $y))
            }
        } else {
            $b02Test.SetPixel($x, $y, $bmp.GetPixel($x, $y))
        }
    }
}

Write-Host "=== New b02 Left Edge ASCII Check (Y=465..535, step=5) ==="
for ($y = 465; $y -le 535; $y += 5) {
    $line = ""
    for ($x = 440; $x -le 490; $x++) {
        $p = $b02Test.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        if ($p.A -eq 0 -or $isGreen) {
            $line += " "
        } else {
            $lum = ($p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11)
            if ($lum -lt 150) { $line += "#" } else { $line += "." }
        }
    }
    Write-Host ("b02 Y={0,3}: {1}" -f $y, $line)
}

$b02Test.Dispose()
$bmp.Dispose()

