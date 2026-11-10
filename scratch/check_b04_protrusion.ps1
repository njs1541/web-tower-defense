Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$b04Path = Join-Path $root 'test\incoming\body_human\b04_arm_near_upper.png'
$b00Path = Join-Path $root 'test\incoming\body_human\b00_master.png'

$b04 = [System.Drawing.Bitmap]::FromFile($b04Path)
$b00 = [System.Drawing.Bitmap]::FromFile($b00Path)

Write-Host "=== b00 Master Silhouette vs b04 Arm Near Upper (Y=434..465, X=418..440) ==="
$protrusions = 0
for ($y = 434; $y -le 465; $y += 2) {
    $line = ""
    for ($x = 418; $x -le 440; $x += 2) {
        $p0 = $b00.GetPixel($x, $y)
        $p4 = $b04.GetPixel($x, $y)
        $char0 = -not ($p0.G -gt 150 -and $p0.R -lt 100 -and $p0.B -lt 100)
        $char4 = $p4.A -gt 0 -and -not ($p4.G -gt 150 -and $p4.R -lt 100 -and $p4.B -lt 100)
        if ($char4 -and -not $char0) {
            $line += "!"
            $protrusions++
        } elseif ($char4) {
            $line += "#"
        } else {
            $line += "."
        }
    }
    Write-Host ("Y={0}: {1}" -f $y, $line)
}
Write-Host ("Total protrusions: {0}" -f $protrusions)

$b04.Dispose(); $b00.Dispose()

