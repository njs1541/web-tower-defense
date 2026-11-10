Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$b02Path = Join-Path $root 'test\incoming\body_human\b02_torso_upper.png'
$b00Path = Join-Path $root 'test\incoming\body_human\b00_master.png'

$b02 = [System.Drawing.Bitmap]::FromFile($b02Path)
$b00 = [System.Drawing.Bitmap]::FromFile($b00Path)

Write-Host "=== b00 Master Silhouette vs b02 Torso (Y=440..465, X=418..440) ==="
for ($y = 440; $y -le 465; $y += 2) {
    $line = ""
    for ($x = 418; $x -le 440; $x += 2) {
        $p0 = $b00.GetPixel($x, $y)
        $p2 = $b02.GetPixel($x, $y)
        $char0 = -not ($p0.G -gt 150 -and $p0.R -lt 100 -and $p0.B -lt 100)
        $char2 = $p2.A -gt 0 -and -not ($p2.G -gt 150 -and $p2.R -lt 100 -and $p2.B -lt 100)
        if ($char2 -and -not $char0) {
            $line += "!" # 원본엔 허공인데 b02가 튀어나온 곳!
        } elseif ($char2) {
            $line += "#"
        } else {
            $line += "."
        }
    }
    Write-Host ("Y={0}: {1}" -f $y, $line)
}

$b02.Dispose(); $b00.Dispose()

