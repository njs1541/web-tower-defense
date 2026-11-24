Add-Type -AssemblyName System.Drawing

$brain = "C:\Users\NZIN\.gemini\antigravity\brain\a9b248b5-71cd-4fef-a353-af82a1fa0bb5"
$sheets = @(
    @{ name="sheet1"; path="$brain\sheet1_head_v2_1795506389454.jpg"; cols=3; rows=2 },
    @{ name="sheet2"; path="$brain\sheet2_body_v2_1795506382526.jpg"; cols=2; rows=2 },
    @{ name="sheet3"; path="$brain\sheet3_arms_final_1795506418917.jpg"; cols=2; rows=2 },
    @{ name="sheet4"; path="$brain\sheet4_legs_weapons_1795506367940.jpg"; cols=2; rows=2 }
)

foreach ($s in $sheets) {
    $bmp = [System.Drawing.Bitmap]::FromFile($s.path)
    $w = $bmp.Width; $h = $bmp.Height
    Write-Host ("=== {0} ({1}x{2}) ===" -f $s.name, $w, $h)
    $cw = [int]($w / $s.cols)
    $rh = [int]($h / $s.rows)
    for ($r = 0; $r -lt $s.rows; $r++) {
        for ($c = 0; $c -lt $s.cols; $c++) {
            $x0 = $c * $cw; $x1 = if ($c -eq ($s.cols - 1)) { $w - 1 } else { ($c + 1) * $cw - 1 }
            $y0 = $r * $rh; $y1 = if ($r -eq ($s.rows - 1)) { $h - 1 } else { ($r + 1) * $rh - 1 }
            if ($s.name -eq "sheet2" -and $r -eq 1) {
                if ($c -eq 1) { continue }
                $x0 = 0; $x1 = $w - 1
            }
            $minX = $w; $maxX = -1; $minY = $h; $maxY = -1
            for ($y = $y0; $y -le $y1; $y++) {
                for ($x = $x0; $x -le $x1; $x++) {
                    $p = $bmp.GetPixel($x, $y)
                    if (-not ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)) {
                        if ($x -lt $minX) { $minX = $x }
                        if ($x -gt $maxX) { $maxX = $x }
                        if ($y -lt $minY) { $minY = $y }
                        if ($y -gt $maxY) { $maxY = $y }
                    }
                }
            }
            if ($maxX -ge 0) {
                Write-Host ("  Cell({0},{1}): box=[{2}..{3}, {4}..{5}] size={6}x{7}" -f $r, $c, $minX, $maxX, $minY, $maxY, ($maxX - $minX + 1), ($maxY - $minY + 1))
            }
        }
    }
    $bmp.Dispose()
}
