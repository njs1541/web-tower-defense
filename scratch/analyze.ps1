Add-Type -AssemblyName System.Drawing
function Analyze-Bmp($rel) {
    $path = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($rel)
    $b = [System.Drawing.Bitmap]::FromFile($path)
    $nonWhite = 0
    for ($y=0; $y -lt $b.Height; $y++) {
        for ($x=0; $x -lt $b.Width; $x++) {
            $p = $b.GetPixel($x, $y)
            if ($p.R -lt 235 -or $p.G -lt 235 -or $p.B -lt 235) {
                $nonWhite++
            }
        }
    }
    Write-Output ($rel + ": " + $b.Width + "x" + $b.Height + ", NonWhite pixels: " + $nonWhite)
    $b.Dispose()
}

Analyze-Bmp ".\scratch\slot_11_raw.png"
Analyze-Bmp ".\scratch\slot_15_raw.png"
