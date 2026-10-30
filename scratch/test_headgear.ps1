Add-Type -AssemblyName System.Drawing

$sheetPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath(".\assets\ref_sylvana_sheet.jpg")
$srcBmp = [System.Drawing.Bitmap]::FromFile($sheetPath)

$rectPct = [System.Drawing.RectangleF]::new(43.3, 67.2, 6.5, 25.0)
$outPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath(".\assets\parts\sylvana_headgear.png")

$sw = [int]$srcBmp.Width
$sh = [int]$srcBmp.Height

$x = [int][Math]::Round(($rectPct.X / 100.0) * $sw)
$y = [int][Math]::Round(($rectPct.Y / 100.0) * $sh)
$w = [int][Math]::Round(($rectPct.Width / 100.0) * $sw)
$h = [int][Math]::Round(($rectPct.Height / 100.0) * $sh)

$cropped = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$srcData = $srcBmp.LockBits([System.Drawing.Rectangle]::new($x, $y, $w, $h), [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$dstData = $cropped.LockBits([System.Drawing.Rectangle]::new(0, 0, $w, $h), [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$stride = [Math]::Abs($srcData.Stride)
$bytes = $stride * $h
$rgbValues = New-Object byte[] $bytes
[System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $rgbValues, 0, $bytes)

for ($i = 0; $i -lt $bytes; $i += 4) {
    $b = [int]$rgbValues[$i]
    $g = [int]$rgbValues[$i + 1]
    $r = [int]$rgbValues[$i + 2]

    if ($r -gt 235 -and $g -gt 235 -and $b -gt 235) {
        $rgbValues[$i + 3] = 0
    } elseif ($r -gt 215 -and $g -gt 215 -and $b -gt 215) {
        $avg = ($r + $g + $b) / 3.0
        $alpha = [byte]([Math]::Max(0.0, [Math]::Min(255.0, (235.0 - $avg) / 20.0 * 255.0)))
        $rgbValues[$i + 3] = $alpha
    } else {
        $rgbValues[$i + 3] = 255
    }
}

[System.Runtime.InteropServices.Marshal]::Copy($rgbValues, 0, $dstData.Scan0, $bytes)
$srcBmp.UnlockBits($srcData)
$cropped.UnlockBits($dstData)

$bx1 = $w; $by1 = $h; $bx2 = -1; $by2 = -1
for ($cy = 0; $cy -lt $h; $cy++) {
    for ($cx = 0; $cx -lt $w; $cx++) {
        $idx = $cy * $stride + $cx * 4
        $alpha = [int]$rgbValues[$idx + 3]
        if ($alpha -gt 30) {
            if ($cx -lt $bx1) { $bx1 = $cx }
            if ($cx -gt $bx2) { $bx2 = $cx }
            if ($cy -lt $by1) { $by1 = $cy }
            if ($cy -gt $by2) { $by2 = $cy }
        }
    }
}

Write-Output ("bx1: $bx1, by1: $by1, bx2: $bx2, by2: $by2")
if ($bx2 -le $bx1 -or $by2 -le $by1) {
    Write-Output "EMPTY CONTENT!"
} else {
    $cropped.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "Saved to: $outPath"
}
$srcBmp.Dispose()
$cropped.Dispose()
