Add-Type -AssemblyName System.Drawing
$imgPath = Resolve-Path "test\incoming\body_human\b00_master.png"
$bmp = [System.Drawing.Bitmap]::FromFile($imgPath)
$w = $bmp.Width
$h = $bmp.Height

# 64x32 ASCII 썸네일 출력
$thumbW = 64
$thumbH = 32
$stepX = [math]::Floor($w / $thumbW)
$stepY = [math]::Floor($h / $thumbH)

Write-Host "ASCII Map (Rough Silhouette):"
for ($ty = 0; $ty -lt $thumbH; $ty++) {
    $line = ""
    for ($tx = 0; $tx -lt $thumbW; $tx++) {
        $p = $bmp.GetPixel($tx * $stepX, $ty * $stepY)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        if ($isGreen) {
            $line += "."
        } else {
            $line += "#"
        }
    }
    Write-Host $line
}

$bmp.Dispose()
