Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

Write-Host "=== Near Shoulder (Left side on screen, X=420..470, Y=450..500) ==="
# 상체 쇄골 끝과 팔이 만나는 어깨 볼의 중심 찾기
# X=440..460, Y=465..485
for ($y = 460; $y -le 490; $y += 3) {
    $line = ""
    for ($x = 430; $x -le 475; $x += 3) {
        $p = $bmp.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        $lum = $p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11
        if ($isGreen) { $line += " ." }
        elseif ($lum -lt 130) { $line += " #" } # 어두운 외곽선/음영
        else { $line += " +" } # 피부
    }
    Write-Host ("Y={0}: {1}" -f $y, $line)
}

Write-Host "`n=== Far Shoulder (Right side on screen, X=565..605, Y=465..505) ==="
for ($y = 465; $y -le 495; $y += 3) {
    $line = ""
    for ($x = 565; $x -le 605; $x += 3) {
        $p = $bmp.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        $lum = $p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11
        if ($isGreen) { $line += " ." }
        elseif ($lum -lt 130) { $line += " #" }
        else { $line += " +" }
    }
    Write-Host ("Y={0}: {1}" -f $y, $line)
}

$bmp.Dispose()

