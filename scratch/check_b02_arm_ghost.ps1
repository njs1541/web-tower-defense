Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$b02Path = Join-Path $root 'test\incoming\body_human\b02_torso_upper.png'
$b02 = [System.Drawing.Bitmap]::FromFile($b02Path)

Write-Host "=== Inspecting b02 Torso around Near Arm boundary (Y=460..580, step=10) ==="
for ($y = 460; $y -le 580; $y += 10) {
    $line = ""
    for ($x = 435; $x -le 490; $x += 2) {
        $p = $b02.GetPixel($x, $y)
        if ($p.A -eq 0 -or ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)) {
            $line += "."
        } else {
            $lum = [math]::Round($p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11)
            if ($lum -lt 140) {
                $line += "#" # 어두운 외곽선/경계선 선화!
            } else {
                $line += "+" # 피부
            }
        }
    }
    Write-Host ("Y={0}: {1}" -f $y, $line)
}
$b02.Dispose()

