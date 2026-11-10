Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Join-Path (Get-Location).Path 'test\incoming\body_human\b00_master.png'))
for ($y = 445; $y -le 465; $y += 2) {
    $line = ''
    for ($x = 570; $x -le 600; $x += 2) {
        $p = $bmp.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        $line += if ($isGreen) { '.' } else { '#' }
    }
    Write-Host ('Y={0}: {1}' -f $y, $line)
}
$bmp.Dispose()

