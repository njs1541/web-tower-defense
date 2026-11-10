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

$armInnerEdge = New-Object 'int[]' $h
for ($y = 440; $y -le 590; $y++) {
    if ($y -lt 475) {
        $armInnerEdge[$y] = [math]::Round(446 + ($y - 458) * 1.88)
    } elseif ($y -le 508) {
        $t = ($y - 475.0) / (508.0 - 475.0)
        $armInnerEdge[$y] = [math]::Round(478.0 * (1.0 - $t) + 463.0 * $t)
    } else {
        $found = 450
        for ($x = 430; $x -le 475; $x++) {
            if (-not $isChar[$x, $y]) { $found = $x - 1; break }
        }
        $armInnerEdge[$y] = $found
    }
}

$b04Test = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($b04Test)
$brush = New-Object System.Drawing.SolidBrush($bgColor)
$g.FillRectangle($brush, 0, 0, $w, $h)
$brush.Dispose()
$g.Dispose()

$shX = 446.0; $shY = 458.0; $shR = 24.0
$elX = 415.0; $elY = 565.0; $elR = 25.0

for ($y = 434; $y -le 592; $y++) {
    for ($x = 380; $x -le 480; $x++) {
        $dx = $x - $shX; $dy = $y - $shY
        $isShoulderBall = (($dx * $dx + $dy * $dy) -le ($shR * $shR))

        if ($isShoulderBall) {
            # 바깥쪽 허공(등 뒤/어깨 외곽: X < shX)은 원본 실루엣 밖 절대 침범 금지!
            if ($x -lt $shX -and -not $isChar[$x, $y]) { continue }

            if ($x -lt $shX) {
                $b04Test.SetPixel($x, $y, $bmp.GetPixel($x, $y))
            } else {
                # 쇄골 쪽에 가려진 안쪽(X >= shX)은 상체 쇄골 그림자가 아닌 팔 어깨 살색(X=438)으로 채움!
                $sampleY = [math]::Max(442, [math]::Min(475, $y))
                $b04Test.SetPixel($x, $y, $bmp.GetPixel(438, $sampleY))
            }
            continue
        }

        # 일반 팔뚝 픽셀 처리
        if (-not $isChar[$x, $y]) { continue }
        if ($x -gt $armInnerEdge[$y]) { continue }

        # 팔꿈치 아래쪽(Y > 565) 반원 캡
        if ($y -gt $elY) {
            $dxEl = $x - $elX; $dyEl = $y - $elY
            if (($dxEl * $dxEl + $dyEl * $dyEl) -gt ($elR * $elR)) { continue }
        }

        $b04Test.SetPixel($x, $y, $bmp.GetPixel($x, $y))
    }
}

Write-Host "=== New b04 Right Edge ASCII Check (Y=465..535, step=5) ==="
for ($y = 465; $y -le 535; $y += 5) {
    $line = ""
    for ($x = 440; $x -le 485; $x++) {
        $p = $b04Test.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        if ($p.A -eq 0 -or $isGreen) {
            $line += " "
        } else {
            $lum = ($p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11)
            if ($lum -lt 150) { $line += "#" } else { $line += "." }
        }
    }
    Write-Host ("b04 Y={0,3}: {1}" -f $y, $line)
}

$b04Test.Dispose()
$bmp.Dispose()

