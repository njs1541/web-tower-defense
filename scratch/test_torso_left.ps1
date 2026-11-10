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

# 상체 왼쪽 실제 외곽선(torsoLeft)과 팔 안쪽 경계선(nearArmRight) 모델링
$torsoLeft = New-Object 'int[]' $h
for ($y = 440; $y -le 620; $y++) {
    if ($y -lt 475) {
        # 어깨 소켓 영역: 피벗(446, 458)과 쇄골 연결
        $torsoLeft[$y] = 446
    } elseif ($y -le 505) {
        # 겨드랑이 가슴 측면 곡선: 456 -> 464로 자연스럽게 연결
        $torsoLeft[$y] = [math]::Round(452 + ($y - 475) * 0.4)
    } else {
        # Y > 505: 실제 몸통 왼쪽 외곽선 (배경 초록색이 끝나는 지점)
        $found = 466
        for ($x = 445; $x -le 480; $x++) {
            if ($isChar[$x, $y]) { $found = $x; break }
        }
        $torsoLeft[$y] = $found
    }
}

Write-Host "=== Generated torsoLeft boundary ==="
for ($y = 460; $y -le 550; $y += 10) {
    Write-Host ("Y={0}: torsoLeft={1}" -f $y, $torsoLeft[$y])
}

$bmp.Dispose()

