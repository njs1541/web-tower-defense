Add-Type -AssemblyName System.Drawing

$outDir = Join-Path (Get-Location).Path "test\incoming\char_cecilia"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

# 기존 c00_complete.png가 있고 c00_complete_v1_old.png가 없으면 백업 보관
$c00Path = Join-Path $outDir "c00_complete.png"
$oldPath = Join-Path $outDir "c00_complete_v1_old.png"
if ((Test-Path $c00Path) -and (-not (Test-Path $oldPath))) {
    Copy-Item $c00Path $oldPath -Force
    Write-Host "Backed up previous c00_complete.png -> c00_complete_v1_old.png"
}

$srcPath = Join-Path $outDir "nai\c00_v4_1329118737.png"
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$pureGreen = [System.Drawing.Color]::FromArgb(255, 0, 255, 0)

function Is-Green([System.Drawing.Color]$p) {
    return ($p.G -gt 145 -and $p.R -lt 125 -and $p.B -lt 125)
}

# 가장자리 8px 제외하고 실제 캐릭터의 topY, footY 실측
$rawTopY = 9999; $rawFootY = -1
for ($y = 8; $y -lt 1016; $y++) {
    for ($x = 8; $x -lt 1016; $x++) {
        $p = $src.GetPixel($x, $y)
        if (-not (Is-Green $p)) {
            if ($y -lt $rawTopY) { $rawTopY = $y }
            if ($y -gt $rawFootY) { $rawFootY = $y }
        }
    }
}

# 부츠 기준 rawCenterX 실측 (y=870..rawFootY)
$footMinX = 9999; $footMaxX = -1
for ($y = 870; $y -le $rawFootY; $y++) {
    for ($x = 200; $x -le 850; $x++) {
        $p = $src.GetPixel($x, $y)
        if (-not (Is-Green $p)) {
            if ($x -lt $footMinX) { $footMinX = $x }
            if ($x -gt $footMaxX) { $footMaxX = $x }
        }
    }
}
$rawCenterX = ($footMinX + $footMaxX) / 2.0
Write-Host ("Measured raw: topY={0}, footY={1} (h={2}), footX=[{3}..{4}] centerX={5:F1}" -f $rawTopY, $rawFootY, ($rawFootY - $rawTopY + 1), $footMinX, $footMaxX, $rawCenterX)

# 가로·세로 동일한 단일 균일 배율(Uniform Scale) 적용: y=180..880 (높이 701px), 중심 x=512
$dstTopY = 180.0
$dstFootY = 880.0
$dstCenterX = 512.0
$scale = ($dstFootY - $dstTopY) / ($rawFootY - $rawTopY)
Write-Host ("Uniform scale factor = {0:F6}" -f $scale)

$out = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
for ($y = 0; $y -lt 1024; $y++) {
    $sy = $rawTopY + (($y - $dstTopY) / $scale)
    $iy = [int][Math]::Floor($sy)
    $fy = $sy - $iy
    for ($x = 0; $x -lt 1024; $x++) {
        if ($x -lt 6 -or $y -lt 6 -or $x -ge 1018 -or $y -ge 1018) {
            $out.SetPixel($x, $y, $pureGreen)
            continue
        }
        $sx = $rawCenterX + (($x - $dstCenterX) / $scale)
        $ix = [int][Math]::Floor($sx)
        $fx = $sx - $ix

        if ($ix -lt 6 -or $iy -lt 6 -or $ix -ge 1017 -or $iy -ge 1017) {
            $out.SetPixel($x, $y, $pureGreen)
            continue
        }

        $rSum = 0.0; $gSum = 0.0; $bSum = 0.0; $wSum = 0.0
        for ($oy = 0; $oy -le 1; $oy++) {
            $wy = if ($oy -eq 0) { 1.0 - $fy } else { $fy }
            for ($ox = 0; $ox -le 1; $ox++) {
                $wx = if ($ox -eq 0) { 1.0 - $fx } else { $fx }
                $wt = $wx * $wy
                $p = $src.GetPixel($ix + $ox, $iy + $oy)
                if (-not (Is-Green $p)) {
                    $pr = [double]$p.R; $pg = [double]$p.G; $pb = [double]$p.B
                    $maxRB = [Math]::Max($pr, $pb)
                    if ($pg -gt ($maxRB + 8)) { $pg = $maxRB }
                    $rSum += $pr * $wt; $gSum += $pg * $wt; $bSum += $pb * $wt
                    $wSum += $wt
                }
            }
        }

        if ($wSum -ge 0.45) {
            $rr = [int][Math]::Max(0, [Math]::Min(255, [Math]::Round($rSum / $wSum)))
            $gg = [int][Math]::Max(0, [Math]::Min(255, [Math]::Round($gSum / $wSum)))
            $bb = [int][Math]::Max(0, [Math]::Min(255, [Math]::Round($bSum / $wSum)))
            $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $rr, $gg, $bb))
        } else {
            $out.SetPixel($x, $y, $pureGreen)
        }
    }
}

$out.Save($c00Path, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved $c00Path"

# 가이드(test/guide/guide_template.png) 겹침 확인 이미지 생성
$guidePath = Join-Path (Get-Location).Path "test\guide\guide_template.png"
$guide = [System.Drawing.Bitmap]::FromFile($guidePath)
$comp = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$gc = [System.Drawing.Graphics]::FromImage($comp)
$gc.DrawImage($out, 0, 0, 1024, 1024)
$gc.DrawImage($guide, 0, 0, 1024, 1024)
$gc.Dispose()
$compPath = Join-Path (Get-Location).Path "scratch\cecilia_c00_with_guide.png"
$comp.Save($compPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved guide overlay to $compPath"

# 정렬 후 실측 좌표 출력 (턱선 rawChinY=324 기준)
$topY = 9999; $footY = -1; $minX = 9999; $maxX = -1
for ($y = 0; $y -lt 1024; $y++) {
    for ($x = 0; $x -lt 1024; $x++) {
        $p = $out.GetPixel($x, $y)
        if (-not ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)) {
            if ($y -lt $topY) { $topY = $y }
            if ($y -gt $footY) { $footY = $y }
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
        }
    }
}
$chinAligned = [int][Math]::Round($dstTopY + (324.0 - $rawTopY) * $scale)
Write-Host ("Aligned measurements: topY={0}, chinY={1} (headH={2}), footY={3} (totalH={4}), x=[{5}..{6}]" -f $topY, $chinAligned, ($chinAligned - $topY), $footY, ($footY - $topY + 1), $minX, $maxX)

$comp.Dispose()
$guide.Dispose()
$out.Dispose()
$src.Dispose()
