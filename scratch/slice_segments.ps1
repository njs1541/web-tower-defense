Add-Type -AssemblyName System.Drawing
$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\body_human\b00_master.png'
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

# 특정 Y 라인에서 X축 연속 구간(아일랜드) 분석
function Analyze-Line($y) {
    $segments = @()
    $inSeg = $false
    $start = 0
    for ($x = 0; $x -lt 1024; $x++) {
        $p = $bmp.GetPixel($x, $y)
        $isChar = -not ($p.G -gt 150 -and $p.R -lt 100 -and $p.B -lt 100)
        if ($isChar -and -not $inSeg) {
            $inSeg = $true
            $start = $x
        } elseif (-not $isChar -and $inSeg) {
            $inSeg = $false
            $segments += "$($start)-$($x-1) (w=$($x-$start))"
        }
    }
    if ($inSeg) {
        $segments += "$($start)-1023 (w=$(1024-$start))"
    }
    Write-Host ("Y=" + $y.ToString().PadLeft(4) + " | " + ($segments -join "  |  "))
}

Write-Host "--- Upper Body / Arms Slice (Y: 480 to 700) ---"
for ($y = 480; $y -le 700; $y += 20) { Analyze-Line $y }

Write-Host "`n--- Pelvis & Legs Slice (Y: 700 to 960) ---"
for ($y = 700; $y -le 960; $y += 20) { Analyze-Line $y }

$bmp.Dispose()

