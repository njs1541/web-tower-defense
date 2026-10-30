Add-Type -AssemblyName System.Drawing

$sheetPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath(".\assets\ref_sylvana_sheet.jpg")
Write-Output ("Loading sheet: " + $sheetPath)
$srcBmp = [System.Drawing.Bitmap]::FromFile($sheetPath)
$sw = [int]$srcBmp.Width
$sh = [int]$srcBmp.Height

$slots = @(
    @{ name = "sylvana_front_core.png";        x = 3.2;  y = 14.1; w = 21.1; h = 43.2 },
    @{ name = "sylvana_base_body.png";         x = 74.0; y = 14.1; w = 21.1; h = 43.2 },
    @{ name = "sylvana_expr_neutral.png";      x = 3.2;  y = 67.2; w = 8.0;  h = 25.0 },
    @{ name = "sylvana_expr_serious.png";      x = 31.8; y = 67.2; w = 8.0;  h = 25.0 },
    @{ name = "sylvana_headgear.png";          x = 43.3; y = 67.2; w = 6.5;  h = 25.0 },
    @{ name = "sylvana_top_dress.png";         x = 51.1; y = 67.2; w = 6.5;  h = 25.0 },
    @{ name = "sylvana_bottom_skirt.png";      x = 59.0; y = 67.2; w = 6.5;  h = 25.0 },
    @{ name = "sylvana_bottom_skirt_back.png"; x = 90.4; y = 67.2; w = 7.4;  h = 25.0 },
    @{ name = "sylvana_wings_cape.png";        x = 66.8; y = 67.2; w = 6.5;  h = 25.0 },
    @{ name = "sylvana_main_weapon.png";       x = 74.7; y = 67.2; w = 6.5;  h = 25.0 },
    @{ name = "sylvana_sub_weapon.png";        x = 82.6; y = 67.2; w = 6.5;  h = 25.0 }
)

foreach ($slot in $slots) {
    $x = [int][Math]::Round(($slot.x / 100.0) * $sw)
    $y = [int][Math]::Round(($slot.y / 100.0) * $sh)
    $w = [int][Math]::Round(($slot.w / 100.0) * $sw)
    $h = [int][Math]::Round(($slot.h / 100.0) * $sh)

    if ($x + $w -gt $sw) { $w = $sw - $x }
    if ($y + $h -gt $sh) { $h = $sh - $y }
    if ($w -le 0 -or $h -le 0) { continue }

    $outPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath(".\assets\parts\" + $slot.name)

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

        if ($r -gt 238 -and $g -gt 238 -and $b -gt 238) {
            $rgbValues[$i + 3] = 0
        } elseif ($r -gt 218 -and $g -gt 218 -and $b -gt 218) {
            $avg = ($r + $g + $b) / 3.0
            $alpha = [byte]([Math]::Max(0.0, [Math]::Min(255.0, (238.0 - $avg) / 20.0 * 255.0)))
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

    if ($bx2 -le $bx1 -or $by2 -le $by1) {
        $cropped.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $cropped.Dispose()
        Write-Output ("Saved (Empty): " + $slot.name)
        continue
    }

    $pad = 4
    $fx1 = [Math]::Max(0, $bx1 - $pad)
    $fy1 = [Math]::Max(0, $by1 - $pad)
    $fx2 = [Math]::Min($w - 1, $bx2 + $pad)
    $fy2 = [Math]::Min($h - 1, $by2 + $pad)
    $fw = $fx2 - $fx1 + 1
    $fh = $fy2 - $fy1 + 1

    $finalBmp = New-Object System.Drawing.Bitmap $fw, $fh, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($finalBmp)
    $g.DrawImage($cropped, [System.Drawing.Rectangle]::new(0, 0, $fw, $fh), [System.Drawing.Rectangle]::new($fx1, $fy1, $fw, $fh), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $cropped.Dispose()

    $finalBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $finalBmp.Dispose()
    Write-Output ("Saved: " + $slot.name + " (" + $fw + " x " + $fh + ")")
}

$srcBmp.Dispose()
Write-Output "EXTRACT_ALL_SLOTS_DONE"
