Add-Type -AssemblyName System.Drawing
$sheetPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath(".\assets\ref_sylvana_sheet.jpg")
$bmp = [System.Drawing.Bitmap]::FromFile($sheetPath)
$sw = $bmp.Width
$sh = $bmp.Height

Write-Output ("Sheet Dimensions: " + $sw + "x" + $sh)

function Save-SlotCrop($name, $xPct, $yPct, $wPct, $hPct) {
    $x = [int][Math]::Round(($xPct / 100.0) * $sw)
    $y = [int][Math]::Round(($yPct / 100.0) * $sh)
    $w = [int][Math]::Round(($wPct / 100.0) * $sw)
    $h = [int][Math]::Round(($hPct / 100.0) * $sh)
    $cropped = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($cropped)
    $g.DrawImage($bmp, [System.Drawing.Rectangle]::new(0, 0, $w, $h), [System.Drawing.Rectangle]::new($x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $out = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath(".\scratch\" + $name + ".png")
    $cropped.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
    Write-Output ("Saved preview: " + $out + " (" + $w + "x" + $h + ")")
}

Save-SlotCrop "slot_11_raw" 59.0 67.2 6.5 25.0
Save-SlotCrop "slot_15_raw" 90.4 67.2 7.4 25.0
$bmp.Dispose()
