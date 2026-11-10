Add-Type -AssemblyName System.Drawing
$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

# 겨드랑이(Armpit), 팔꿈치(Elbow), 어깨(Shoulder), 턱선(Chin), 가랑이(Crotch)의 정밀 좌표 탐색

# 1. 턱 끝 및 목: Y=350~450 사이의 중심과 폭
Write-Host "=== 1. Chin & Neck (Y: 360 to 440) ==="
for ($y = 360; $y -le 440; $y += 5) {
    $minX = 1000; $maxX = 0
    for ($x = 440; $x -le 600; $x++) {
        $p = $bmp.GetPixel($x, $y)
        if (-not ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
        }
    }
    $w = if ($maxX -ge $minX) { $maxX - $minX } else { 0 }
    $cx = [math]::Round(($minX + $maxX) / 2)
    Write-Host "Y=$y | minX=$minX maxX=$maxX width=$w center=$cx"
}

# 2. 어깨와 겨드랑이 (Shoulders & Armpits: Y=440~560)
Write-Host "`n=== 2. Armpit Inner Gaps (겨드랑이 틈새 시작점) ==="
# 겨드랑이는 몸통과 팔 사이의 녹색 배경 틈새가 시작되는 곳!
for ($y = 480; $y -le 580; $y += 5) {
    # X=400~640을 스캔하여 [먼팔] [녹색틈새1] [몸통] [녹색틈새2] [가까운팔] 확인
    $str = ""
    for ($x = 380; $x -le 660; $x += 2) {
        $p = $bmp.GetPixel($x, $y)
        $isChar = -not ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        $str += if ($isChar) { "#" } else { "." }
    }
    Write-Host "Y=$y : $str"
}

# 3. 가랑이 (Crotch: 다리 갈라지는 점)
Write-Host "`n=== 3. Crotch (다리 갈라지는 지점) ==="
for ($y = 660; $y -le 760; $y += 5) {
    $str = ""
    for ($x = 450; $x -le 580; $x += 2) {
        $p = $bmp.GetPixel($x, $y)
        $isChar = -not ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        $str += if ($isChar) { "#" } else { "." }
    }
    Write-Host "Y=$y : $str"
}

$bmp.Dispose()

