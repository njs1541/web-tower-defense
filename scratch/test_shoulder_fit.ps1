Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

Write-Host "=== Near Shoulder Circle Test at [446, 458], R=20 ==="
for ($y = 438; $y -le 478; $y += 2) {
    $line = ""
    for ($x = 426; $x -le 466; $x += 2) {
        $dx = $x - 446.0; $dy = $y - 458.0
        $dist = [math]::Sqrt($dx*$dx + $dy*$dy)
        $p = $bmp.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        
        if ([math]::Abs($dist - 20) -lt 1.2) {
            $line += "O" # 원 둘레 마커
        } elseif ($isGreen) {
            $line += "."
        } else {
            $line += "+"
        }
    }
    Write-Host ("Y={0}: {1}" -f $y, $line)
}

Write-Host "`n=== Far Shoulder Circle Test at [582, 460], R=18 ==="
for ($y = 442; $y -le 480; $y += 2) {
    $line = ""
    for ($x = 564; $x -le 600; $x += 2) {
        $dx = $x - 582.0; $dy = $y - 460.0
        $dist = [math]::Sqrt($dx*$dx + $dy*$dy)
        $p = $bmp.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        
        if ([math]::Abs($dist - 18) -lt 1.2) {
            $line += "O" # 원 둘레 마커
        } elseif ($isGreen) {
            $line += "."
        } else {
            $line += "+"
        }
    }
    Write-Host ("Y={0}: {1}" -f $y, $line)
}

$bmp.Dispose()

