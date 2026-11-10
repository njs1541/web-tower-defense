Add-Type -AssemblyName System.Drawing

$dir = 'test\incoming\char_liana'
$src = [System.Drawing.Bitmap]::FromFile((Join-Path $dir 'c00_complete.png'))
$c11 = [System.Drawing.Bitmap]::FromFile((Join-Path $dir 'c11_pants_near.png'))
$c09 = [System.Drawing.Bitmap]::FromFile((Join-Path $dir 'c09_sleeve_near.png'))

# 1. c11 앞쪽 발끝 마감
for ($y = 920; $y -le 955; $y++) {
    for ($x = 410; $x -le 500; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if (-not $isGreen) {
            $c11.SetPixel($x, $y, $p)
        }
    }
}
$c11.Save((Join-Path $dir 'c11_pants_near_new.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c11.Dispose()
Move-Item (Join-Path $dir 'c11_pants_near_new.png') (Join-Path $dir 'c11_pants_near.png') -Force

# 2. c09 가까운 소매 보강
for ($y = 410; $y -le 565; $y++) {
    for ($x = 350; $x -le 465; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }
        if ($x -lt 440 -and $y -lt 555) {
            $c09.SetPixel($x, $y, $p)
        }
    }
}
$c09.Save((Join-Path $dir 'c09_sleeve_near_new.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c09.Dispose()
Move-Item (Join-Path $dir 'c09_sleeve_near_new.png') (Join-Path $dir 'c09_sleeve_near.png') -Force

$src.Dispose()
Write-Host "Polish applied successfully to c11 and c09!"

