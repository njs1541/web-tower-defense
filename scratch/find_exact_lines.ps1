Add-Type -AssemblyName System.Drawing
$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

Write-Host "=== Exact X coordinates of dark lines (#) for Y=430 to 710 ==="
for ($y = 430; $y -le 710; $y += 10) {
    $darkXs = @()
    $greenGaps = @()
    $inGreen = $true
    $gStart = 340
    for ($x = 340; $x -le 690; $x++) {
        $p = $bmp.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        if (-not $isGreen) {
            if ($inGreen) {
                if ($x -gt 340) { $greenGaps += "$gStart..$($x-1)" }
                $inGreen = $false
            }
            $lum = ($p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11)
            if ($lum -lt 135) {
                $darkXs += $x
            }
        } else {
            if (-not $inGreen) {
                $gStart = $x
                $inGreen = $true
            }
        }
    }
    # 연속된 darkX들을 그룹화
    $groups = @()
    if ($darkXs.Count -gt 0) {
        $s = $darkXs[0]; $prev = $darkXs[0]
        for ($i = 1; $i -lt $darkXs.Count; $i++) {
            if ($darkXs[$i] -le $prev + 3) {
                $prev = $darkXs[$i]
            } else {
                $groups += "$([math]::Round(($s+$prev)/2))[$s-$prev]"
                $s = $darkXs[$i]; $prev = $darkXs[$i]
            }
        }
        $groups += "$([math]::Round(($s+$prev)/2))[$s-$prev]"
    }
    Write-Host ("Y=" + $y.ToString().PadLeft(3) + " | Lines: " + ($groups -join ", ") + " | Gaps: " + ($greenGaps -join ", "))
}
$bmp.Dispose()

