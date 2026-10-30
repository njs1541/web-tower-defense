Add-Type -AssemblyName System.Drawing

function Remove-MagentaChromaKeyAndSave($srcBmp, $rect, $relPath) {
    $outPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($relPath)
    $x = [int]$rect.X
    $y = [int]$rect.Y
    $w = [int]$rect.Width
    $h = [int]$rect.Height

    if ($x + $w -gt $srcBmp.Width) { $w = $srcBmp.Width - $x }
    if ($y + $h -gt $srcBmp.Height) { $h = $srcBmp.Height - $y }

    $targetBmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $srcData = $srcBmp.LockBits([System.Drawing.Rectangle]::new($x, $y, $w, $h), [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $dstData = $targetBmp.LockBits([System.Drawing.Rectangle]::new(0, 0, $w, $h), [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    $bytes = [Math]::Abs($srcData.Stride) * $h
    $rgbValues = New-Object byte[] $bytes
    [System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $rgbValues, 0, $bytes)

    for ($i = 0; $i -lt $bytes; $i += 4) {
        $b = $rgbValues[$i]
        $g = $rgbValues[$i + 1]
        $r = $rgbValues[$i + 2]

        # 마젠타 검출 (Distance to RGB(255, 0, 255))
        $dr = 255 - $r
        $dg = $g
        $db = 255 - $b
        $dist = [Math]::Sqrt($dr*$dr + $dg*$dg + $db*$db)

        if ($dist -lt 95.0) {
            $rgbValues[$i + 3] = 0
        } elseif ($dist -lt 140.0) {
            $alpha = [byte](($dist - 95.0) / (140.0 - 95.0) * 255)
            $rgbValues[$i + 3] = $alpha
            $rgbValues[$i + 1] = [byte][Math]::Min(255, $g + 30)
        } else {
            $rgbValues[$i + 3] = 255
        }
    }

    [System.Runtime.InteropServices.Marshal]::Copy($rgbValues, 0, $dstData.Scan0, $bytes)
    $srcBmp.UnlockBits($srcData)
    $targetBmp.UnlockBits($dstData)

    $targetBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $targetBmp.Dispose()
    Write-Output "Saved: $outPath ($w x $h)"
}

$pathA = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath(".\assets\ref_sylvana_sheet_a.jpg")
$pathB = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath(".\assets\ref_sylvana_sheet_b.jpg")

$bmpA = [System.Drawing.Bitmap]::FromFile($pathA)
$bmpB = [System.Drawing.Bitmap]::FromFile($pathB)

$wA = $bmpA.Width
$hA = $bmpA.Height
$wB = $bmpB.Width
$hB = $bmpB.Height

# 1. Sheet A: 01 Front Core & 04 Base Body
Remove-MagentaChromaKeyAndSave $bmpA ([System.Drawing.RectangleF]::new($wA * 0.02, $hA * 0.10, $wA * 0.23, $hA * 0.85)) ".\assets\parts\sylvana_front_core.png"
Remove-MagentaChromaKeyAndSave $bmpA ([System.Drawing.RectangleF]::new($wA * 0.74, $hA * 0.10, $wA * 0.24, $hA * 0.85)) ".\assets\parts\sylvana_base_body.png"

# 2. Sheet B: Top Row (Expressions)
Remove-MagentaChromaKeyAndSave $bmpB ([System.Drawing.RectangleF]::new($wB * 0.03, $hB * 0.08, $wB * 0.22, $hB * 0.40)) ".\assets\parts\sylvana_expr_neutral.png"
Remove-MagentaChromaKeyAndSave $bmpB ([System.Drawing.RectangleF]::new($wB * 0.75, $hB * 0.08, $wB * 0.22, $hB * 0.40)) ".\assets\parts\sylvana_expr_serious.png"

# 3. Sheet B: Bottom Row (Equipment)
Remove-MagentaChromaKeyAndSave $bmpB ([System.Drawing.RectangleF]::new($wB * 0.02, $hB * 0.54, $wB * 0.15, $hB * 0.42)) ".\assets\parts\sylvana_headgear.png"
Remove-MagentaChromaKeyAndSave $bmpB ([System.Drawing.RectangleF]::new($wB * 0.18, $hB * 0.54, $wB * 0.15, $hB * 0.42)) ".\assets\parts\sylvana_top_dress.png"
Remove-MagentaChromaKeyAndSave $bmpB ([System.Drawing.RectangleF]::new($wB * 0.34, $hB * 0.54, $wB * 0.15, $hB * 0.42)) ".\assets\parts\sylvana_bottom_skirt.png"
Remove-MagentaChromaKeyAndSave $bmpB ([System.Drawing.RectangleF]::new($wB * 0.34, $hB * 0.54, $wB * 0.15, $hB * 0.42)) ".\assets\parts\sylvana_bottom_skirt_back.png"
Remove-MagentaChromaKeyAndSave $bmpB ([System.Drawing.RectangleF]::new($wB * 0.50, $hB * 0.54, $wB * 0.15, $hB * 0.42)) ".\assets\parts\sylvana_wings_cape.png"
Remove-MagentaChromaKeyAndSave $bmpB ([System.Drawing.RectangleF]::new($wB * 0.66, $hB * 0.54, $wB * 0.16, $hB * 0.42)) ".\assets\parts\sylvana_main_weapon.png"
Remove-MagentaChromaKeyAndSave $bmpB ([System.Drawing.RectangleF]::new($wB * 0.83, $hB * 0.54, $wB * 0.15, $hB * 0.42)) ".\assets\parts\sylvana_sub_weapon.png"

$bmpA.Dispose()
$bmpB.Dispose()
Write-Output "EXTRACT_COMPLETE"
