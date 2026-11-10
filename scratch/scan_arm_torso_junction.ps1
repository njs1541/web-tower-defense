Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

Write-Host "=== Original b00 Near Arm and Torso boundary (Y=460..540, step=10) ==="
for ($y = 460; $y -le 540; $y += 10) {
    $line = ""
    for ($x = 420; $x -le 490; $x += 2) {
        $p = $bmp.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        $lum = [math]::Round($p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11)
        if ($isGreen) { $line += "." }
        elseif ($lum -lt 140) { $line += "#" } # 외곽선
        elseif ($lum -lt 200) { $line += "=" } # 음영 피부
        else { $line += "+" } # 밝은 피부
    }
    Write-Host ("Y={0}: {1}" -f $y, $line)
}
$bmp.Dispose()

