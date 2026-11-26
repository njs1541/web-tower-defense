Add-Type -AssemblyName System.Drawing

$dir = Join-Path (Get-Location).Path "test\incoming\char_liana"
$s2 = [System.Drawing.Bitmap]::FromFile((Join-Path $dir "sheet2_body_v1.png"))
$s3 = [System.Drawing.Bitmap]::FromFile((Join-Path $dir "sheet3_arms_v1.png"))

function Is-Green([System.Drawing.Color]$p) {
    return ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
}

Write-Host "=== 1. sheet2_body_v1 torso (x=187..372, y=144..375) ==="
# Check collar region (y=144..205) and bottom cuirass region (y=300..375)
for ($y = 144; $y -le 205; $y += 4) {
    $line = ""
    for ($x = 225; $x -le 335; $x += 3) {
        $p = $s2.GetPixel($x, $y)
        if (Is-Green $p) { $line += "." }
        else {
            $lum = 0.3*$p.R + 0.59*$p.G + 0.11*$p.B
            # Silver armor vs cream collar vs brown strap vs dark line
            if ($lum -lt 95) { $line += "#" }
            elseif (($p.R - $p.B) -gt 45 -and $lum -lt 170) { $line += "S" } # strap
            elseif (($p.R - $p.B) -gt 18 -and $lum -ge 170) { $line += "C" } # cream cloth
            else { $line += "A" } # silver armor
        }
    }
    Write-Host ("y={0:D3}: {1}" -f $y, $line)
}

Write-Host "--- torso bottom (y=310..375) ---"
for ($y = 310; $y -le 375; $y += 3) {
    $line = ""
    for ($x = 195; $x -le 365; $x += 4) {
        $p = $s2.GetPixel($x, $y)
        if (Is-Green $p) { $line += "." }
        else {
            $lum = 0.3*$p.R + 0.59*$p.G + 0.11*$p.B
            if ($lum -lt 95) { $line += "#" }
            elseif (($p.R - $p.B) -gt 16) { $line += "C" } # cream cloth below armor
            else { $line += "A" } # silver armor
        }
    }
    Write-Host ("y={0:D3}: {1}" -f $y, $line)
}

Write-Host "=== 2. sheet3_arms_v1 arm_near_upper (x=212..346, y=144..373) ==="
for ($y = 265; $y -le 373; $y += 3) {
    $line = ""
    for ($x = 210; $x -le 320; $x += 3) {
        $p = $s3.GetPixel($x, $y)
        if (Is-Green $p) { $line += "." }
        else {
            $lum = 0.3*$p.R + 0.59*$p.G + 0.11*$p.B
            if ($lum -lt 105) { $line += "#" }
            elseif (($p.R - $p.G) -gt 28) { $line += "K" } # bare skin (peach: R >> G > B)
            else { $line += "C" } # cream cuff
        }
    }
    Write-Host ("y={0:D3}: {1}" -f $y, $line)
}

$s2.Dispose(); $s3.Dispose()
