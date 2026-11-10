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

# 상체 중심(X=500)에서 왼쪽으로 스캔하여 상체의 진짜 외곽선 찾기
Write-Host "=== Torso Left boundary scanned from X=500 outwards ==="
for ($y = 480; $y -le 570; $y += 5) {
    $found = 470
    for ($x = 500; $x -ge 430; $x--) {
        if (-not $isChar[$x, $y]) {
            $found = $x + 1; break
        }
    }
    Write-Host ("Y={0}: Torso Left Outline X = {1}" -f $y, $found)
}

$bmp.Dispose()

