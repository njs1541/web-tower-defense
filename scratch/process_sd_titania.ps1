Add-Type -AssemblyName System.Drawing

$srcSheetPath = "C:\Users\NZIN\.gemini\antigravity\brain\24a020d7-db31-4d3e-b612-879d69b02784\char_titania_sd_modular_rigging_sheet_1793262894156.jpg"
$rawBmp = [System.Drawing.Bitmap]::FromFile($srcSheetPath)

# 2048 x 1152 표준 해상도로 리사이즈 복제
$sheetBmp = New-Object System.Drawing.Bitmap(2048, 1152, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($sheetBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($rawBmp, 0, 0, 2048, 1152)
$rawBmp.Dispose()

$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))

# 1. 슬롯 09 (x=880, y=730, w=145, h=370) 내부 하단에 중복 그려진 브라 파츠(y: 930~1068) 제거하여 순수 머리장식(티아라)만 남김
$g.FillRectangle($whiteBrush, 884, 925, 137, 143)

# 2. 슬롯 10 (x=1041, y=730, w=145, h=370) 내부 하단에 중복 그려진 치마 파츠(y: 895~1068) 제거하여 순수 상의(비키니 탑)만 남김
$g.FillRectangle($whiteBrush, 1045, 892, 137, 176)

# 3. 슬롯 01~04 하단 서브라벨(y: 650~677) 및 슬롯 05~13 하단 서브라벨(y: 1066~1096)을 순백색으로 마스킹하여 발끝이 잘리지 않게 보호
$g.FillRectangle($whiteBrush, 65, 650, 1885, 28)
$g.FillRectangle($whiteBrush, 65, 1066, 1600, 31)

$g.Dispose()

# 클리닝된 SD 설정 시트를 ref_titania_sheet.jpg 및 sd_titania_parts_sheet.jpg로 저장
$refOutPath = "c:\Users\NZIN\Downloads\개인 개발분\타워디펜스\assets\ref_titania_sheet.jpg"
$sdSheetOutPath = "c:\Users\NZIN\Downloads\개인 개발분\타워디펜스\assets\sd_titania_parts_sheet.jpg"
$sheetBmp.Save($refOutPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$sheetBmp.Save($sdSheetOutPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
Write-Output "Saved cleaned SD sheet to $refOutPath"

# 배경 제거 및 내부 갇힌 순백색 구멍(머리카락-목-팔 사이 흰색 여백) 투명화 함수
function Extract-CleanPart($srcBmp, $rx, $ry, $rw, $rh, $outFile, $removeInnerWhitePockets = $true, $strictWingMode = $false, $isCostumePart = $false) {
    $cropX = $rx + 6
    $cropY = $ry + 42
    $cropW = $rw - 12
    $cropH = $rh - 52

    $partBmp = New-Object System.Drawing.Bitmap($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    for ($y = 0; $y -lt $cropH; $y++) {
        for ($x = 0; $x -lt $cropW; $x++) {
            $c = $srcBmp.GetPixel($cropX + $x, $cropY + $y)
            $partBmp.SetPixel($x, $y, $c)
        }
    }

    # 1차: 외곽 BFS Flood-Fill 배경 제거
    $visited = New-Object 'bool[,]' $cropW, $cropH
    $queue = New-Object System.Collections.Generic.Queue[System.Drawing.Point]

    function Is-BgWhite($col) {
        $max = [Math]::Max($col.R, [Math]::Max($col.G, $col.B))
        $min = [Math]::Min($col.R, [Math]::Min($col.G, $col.B))
        $sat = $max - $min
        $lum = 0.299 * $col.R + 0.587 * $col.G + 0.114 * $col.B
        if ($strictWingMode) {
            return ($lum -ge 248 -and $sat -le 8)
        }
        return ($lum -ge 236 -and $sat -le 26)
    }

    for ($x = 0; $x -lt $cropW; $x++) {
        $queue.Enqueue((New-Object System.Drawing.Point($x, 0)))
        $queue.Enqueue((New-Object System.Drawing.Point($x, ($cropH - 1))))
        $visited[$x, 0] = $true
        $visited[$x, ($cropH - 1)] = $true
    }
    for ($y = 0; $y -lt $cropH; $y++) {
        $queue.Enqueue((New-Object System.Drawing.Point(0, $y)))
        $queue.Enqueue((New-Object System.Drawing.Point(($cropW - 1), $y)))
        $visited[0, $y] = $true
        $visited[($cropW - 1), $y] = $true
    }

    $dx = @(-1, 1, 0, 0)
    $dy = @(0, 0, -1, 1)

    while ($queue.Count -gt 0) {
        $pt = $queue.Dequeue()
        $col = $partBmp.GetPixel($pt.X, $pt.Y)
        if (Is-BgWhite $col) {
            $partBmp.SetPixel($pt.X, $pt.Y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            for ($d = 0; $d -lt 4; $d++) {
                $nx = $pt.X + $dx[$d]
                $ny = $pt.Y + $dy[$d]
                if ($nx -ge 0 -and $nx -lt $cropW -and $ny -ge 0 -and $ny -lt $cropH) {
                    if (-not $visited[$nx, $ny]) {
                        $visited[$nx, $ny] = $true
                        $queue.Enqueue((New-Object System.Drawing.Point($nx, $ny)))
                    }
                }
            }
        }
    }

    # 2차: 머리카락과 몸통/팔 사이에 갇힌 순백색 배경 포켓(Inner White Pockets) 제거 (눈동자 흰자위 보호)
    if ($removeInnerWhitePockets) {
        $compVisited = New-Object 'bool[,]' $cropW, $cropH
        for ($y = 1; $y -lt ($cropH - 1); $y++) {
            for ($x = 1; $x -lt ($cropW - 1); $x++) {
                if ($compVisited[$x, $y]) { continue }
                $col = $partBmp.GetPixel($x, $y)
                if ($col.A -eq 0) { continue }
                $max = [Math]::Max($col.R, [Math]::Max($col.G, $col.B))
                $min = [Math]::Min($col.R, [Math]::Min($col.G, $col.B))
                $pMinThresh = if ($isCostumePart) { 215 } else { 242 }
                $pSatThresh = if ($isCostumePart) { 26 } else { 10 }
                if ($min -ge $pMinThresh -and ($max - $min) -le $pSatThresh) {
                    # 연결된 순백색 컴포넌트 수집
                    $compPts = New-Object System.Collections.Generic.List[System.Drawing.Point]
                    $q2 = New-Object System.Collections.Generic.Queue[System.Drawing.Point]
                    $q2.Enqueue((New-Object System.Drawing.Point($x, $y)))
                    $compVisited[$x, $y] = $true
                    $minY = $y; $maxY = $y
                    while ($q2.Count -gt 0) {
                        $p = $q2.Dequeue()
                        $compPts.Add($p)
                        if ($p.Y -lt $minY) { $minY = $p.Y }
                        if ($p.Y -gt $maxY) { $maxY = $p.Y }
                        for ($d = 0; $d -lt 4; $d++) {
                            $nx = $p.X + $dx[$d]
                            $ny = $p.Y + $dy[$d]
                            if ($nx -ge 0 -and $nx -lt $cropW -and $ny -ge 0 -and $ny -lt $cropH -and -not $compVisited[$nx, $ny]) {
                                $nc = $partBmp.GetPixel($nx, $ny)
                                if ($nc.A -gt 0) {
                                    $nmax = [Math]::Max($nc.R, [Math]::Max($nc.G, $nc.B))
                                    $nmin = [Math]::Min($nc.R, [Math]::Min($nc.G, $nc.B))
                                    if ($nmin -ge ($pMinThresh - 8) -and ($nmax - $nmin) -le ($pSatThresh + 4)) {
                                        $compVisited[$nx, $ny] = $true
                                        $q2.Enqueue((New-Object System.Drawing.Point($nx, $ny)))
                                    }
                                }
                            }
                        }
                    }
                    # 의상/장신구 파츠(isCostumePart=true)는 눈동자가 없으므로 상의 홀터넥 안쪽 흰색 구멍 등을 100% 제거!
                    $isEyeRegion = (-not $isCostumePart) -and ($minY -ge ($cropH * 0.16) -and $maxY -le ($cropH * 0.44) -and $compPts.Count -lt 140)
                    $isLowerLeg = (-not $isCostumePart) -and ($minY -ge ($cropH * 0.70))
                    $minPocketSize = if ($isCostumePart) { 5 } else { 35 }
                    if (-not $isEyeRegion -and -not $isLowerLeg -and $compPts.Count -ge $minPocketSize) {
                        foreach ($pt in $compPts) {
                            $partBmp.SetPixel($pt.X, $pt.Y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                        }
                    }
                }
            }
        }
    }

    # 3차: 실제 불투명 픽셀 타이트 바운딩 박스 크롭 (여백 4px)
    $bx1 = $cropW; $by1 = $cropH; $bx2 = 0; $by2 = 0
    for ($y = 0; $y -lt $cropH; $y++) {
        for ($x = 0; $x -lt $cropW; $x++) {
            $c = $partBmp.GetPixel($x, $y)
            if ($c.A -gt 20) {
                if ($x -lt $bx1) { $bx1 = $x }
                if ($x -gt $bx2) { $bx2 = $x }
                if ($y -lt $by1) { $by1 = $y }
                if ($y -gt $by2) { $by2 = $y }
            }
        }
    }

    if ($bx2 -gt $bx1 -and $by2 -gt $by1) {
        $pad = 4
        $fx1 = [Math]::Max(0, $bx1 - $pad)
        $fy1 = [Math]::Max(0, $by1 - $pad)
        $fx2 = [Math]::Min($cropW - 1, $bx2 + $pad)
        $fy2 = [Math]::Min($cropH - 1, $by2 + $pad)
        $fw = $fx2 - $fx1 + 1
        $fh = $fy2 - $fy1 + 1

        $finalBmp = New-Object System.Drawing.Bitmap($fw, $fh, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        for ($y = 0; $y -lt $fh; $y++) {
            for ($x = 0; $x -lt $fw; $x++) {
                $finalBmp.SetPixel($x, $y, $partBmp.GetPixel($fx1 + $x, $fy1 + $y))
            }
        }
        $finalBmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Output ("Extracted {0} -> {1}x{2} (from bbox {3},{4} to {5},{6})" -f [System.IO.Path]::GetFileName($outFile), $fw, $fh, $fx1, $fy1, $fx2, $fy2)
        $finalBmp.Dispose()
    }
    $partBmp.Dispose()
}

$partsDir = "c:\Users\NZIN\Downloads\개인 개발분\타워디펜스\assets\parts"
Extract-CleanPart $sheetBmp 60   120 445 560 "$partsDir\titania_front_core.png" $true
Extract-CleanPart $sheetBmp 1509 120 445 560 "$partsDir\titania_base_body.png"  $true

Extract-CleanPart $sheetBmp 60   730 175 370 "$partsDir\titania_expr_neutral.png"   $true
Extract-CleanPart $sheetBmp 255  730 175 370 "$partsDir\titania_expr_smile.png"     $true
Extract-CleanPart $sheetBmp 450  730 175 370 "$partsDir\titania_expr_confident.png" $true
Extract-CleanPart $sheetBmp 645  730 175 370 "$partsDir\titania_expr_serious.png"   $true

Extract-CleanPart $sheetBmp 880  730 145 370 "$partsDir\titania_headgear.png"     $true  $false $true
Extract-CleanPart $sheetBmp 1041 730 145 370 "$partsDir\titania_top_dress.png"    $true  $false $true
Extract-CleanPart $sheetBmp 1202 730 145 370 "$partsDir\titania_bottom_skirt.png" $true  $false $true
Extract-CleanPart $sheetBmp 1363 730 145 370 "$partsDir\titania_wings_cape.png"   $false $true  $false
Extract-CleanPart $sheetBmp 1524 730 145 370 "$partsDir\titania_main_weapon.png"  $true  $false $true

$sheetBmp.Dispose()

