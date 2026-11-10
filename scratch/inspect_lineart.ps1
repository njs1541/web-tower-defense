Add-Type -AssemblyName System.Drawing
$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

# 몸통과 팔이 만나는 영역 (X: 350~680, Y: 440~690)에서 외곽선(어두운 픽셀)과 피부(밝은 픽셀)를 구분하여 ASCII로 출력
# '.' = 배경(녹색), '#' = 외곽선(어두운 선), '+' = 피부(내부 채색)
Write-Host "=== Detailed Lineart & Fill Map (Y: 420 to 720, step Y=8, step X=4) ==="
for ($y = 420; $y -le 720; $y += 8) {
    $line = "Y=" + $y.ToString().PadLeft(3) + " "
    for ($x = 340; $x -le 684; $x += 4) {
        $p = $bmp.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        if ($isGreen) {
            $line += "."
        } else {
            # 밝기 계산
            $lum = ($p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11)
            if ($lum -lt 140) {
                $line += "#" # 외곽선 (어두운 선)
            } elseif ($lum -lt 200) {
                $line += "=" # 그림자 / 진한 피부
            } else {
                $line += "+" # 밝은 피부
            }
        }
    }
    Write-Host $line
}
$bmp.Dispose()

