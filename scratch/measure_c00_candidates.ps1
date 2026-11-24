Add-Type -AssemblyName System.Drawing

$files = @(
    "C:\Users\NZIN\.gemini\antigravity\brain\a9b248b5-71cd-4fef-a353-af82a1fa0bb5\c00_complete_1795504812438.jpg",
    "C:\Users\NZIN\.gemini\antigravity\brain\a9b248b5-71cd-4fef-a353-af82a1fa0bb5\c00_complete_1795504843172.jpg",
    "C:\Users\NZIN\.gemini\antigravity\brain\a9b248b5-71cd-4fef-a353-af82a1fa0bb5\c00_complete_1795504871491.jpg"
)

foreach ($f in $files) {
    $bmp = [System.Drawing.Bitmap]::FromFile($f)
    $w = $bmp.Width; $h = $bmp.Height
    $rows = New-Object int[] $h
    for ($y = 0; $y -lt $h; $y++) {
        $c = 0
        for ($x = 0; $x -lt $w; $x++) {
            $p = $bmp.GetPixel($x, $y)
            if (-not ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)) { $c++ }
        }
        $rows[$y] = $c
    }
    $top = 0; while ($top -lt $h -and $rows[$top] -eq 0) { $top++ }
    $foot = $h - 1; while ($foot -ge 0 -and $rows[$foot] -eq 0) { $foot-- }
    $totH = $foot - $top + 1
    $scale = 700.0 / [double]($foot - $top)
    Write-Host ("{0}: top={1}, foot={2}, totalH={3}, uniformScale={4:F4}" -f [System.IO.Path]::GetFileName($f), $top, $foot, $totH, $scale)
    $bmp.Dispose()
}
