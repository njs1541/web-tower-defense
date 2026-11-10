Add-Type -AssemblyName System.Drawing
$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

Write-Host "=== Chin & Neck Lineart Detail (Y: 350 to 445, step Y=3, X: 440 to 600, step X=2) ==="
for ($y = 350; $y -le 445; $y += 3) {
    $line = "Y=" + $y.ToString().PadLeft(3) + " "
    for ($x = 440; $x -le 600; $x += 2) {
        $p = $bmp.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        if ($isGreen) {
            $line += "."
        } else {
            $lum = ($p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11)
            if ($lum -lt 135) {
                $line += "#"
            } elseif ($lum -lt 195) {
                $line += "=" # 목 그림자!
            } else {
                $line += "+" # 밝은 얼굴 피부!
            }
        }
    }
    Write-Host $line
}
$bmp.Dispose()

