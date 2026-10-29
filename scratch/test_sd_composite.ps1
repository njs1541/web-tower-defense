Add-Type -AssemblyName System.Drawing

# 날개 파츠 내부 핑크-화이트 광택 보존 재추출
$srcSheet = [System.Drawing.Bitmap]::FromFile("c:\Users\NZIN\Downloads\개인 개발분\타워디펜스\assets\ref_titania_sheet.jpg")
$cw = 133; $ch = 305
$pb = New-Object System.Drawing.Bitmap($cw, $ch, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for ($y = 0; $y -lt $ch; $y++) {
    for ($x = 0; $x -lt $cw; $x++) {
        $pb.SetPixel($x, $y, $srcSheet.GetPixel(1369 + $x, 772 + $y))
    }
}
$vis = New-Object 'bool[,]' $cw, $ch
$q = New-Object System.Collections.Generic.Queue[System.Drawing.Point]
for ($x = 0; $x -lt $cw; $x++) {
    $q.Enqueue((New-Object System.Drawing.Point($x, 0)))
    $q.Enqueue((New-Object System.Drawing.Point($x, ($ch - 1))))
    $vis[$x, 0] = $true; $vis[$x, ($ch - 1)] = $true
}
for ($y = 0; $y -lt $ch; $y++) {
    $q.Enqueue((New-Object System.Drawing.Point(0, $y)))
    $q.Enqueue((New-Object System.Drawing.Point(($cw - 1), $y)))
    $vis[0, $y] = $true; $vis[($cw - 1), $y] = $true
}
$dxArr = @(-1, 1, 0, 0); $dyArr = @(0, 0, -1, 1)
while ($q.Count -gt 0) {
    $p = $q.Dequeue()
    $c = $pb.GetPixel($p.X, $p.Y)
    $mx = [Math]::Max($c.R, [Math]::Max($c.G, $c.B))
    $mn = [Math]::Min($c.R, [Math]::Min($c.G, $c.B))
    $lum = 0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B
    if ($lum -ge 249 -and ($mx - $mn) -le 6) {
        $pb.SetPixel($p.X, $p.Y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        for ($d = 0; $d -lt 4; $d++) {
            $nx = $p.X + $dxArr[$d]; $ny = $p.Y + $dyArr[$d]
            if ($nx -ge 0 -and $nx -lt $cw -and $ny -ge 0 -and $ny -lt $ch -and -not $vis[$nx, $ny]) {
                $vis[$nx, $ny] = $true
                $q.Enqueue((New-Object System.Drawing.Point($nx, $ny)))
            }
        }
    }
}
$pb.Save("c:\Users\NZIN\Downloads\개인 개발분\타워디펜스\assets\parts\titania_wings_cape.png", [System.Drawing.Imaging.ImageFormat]::Png)
$pb.Dispose()
$srcSheet.Dispose()

$W = 250
$H = 270
$canvas = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($canvas)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
$g.FillRectangle($bgBrush, 0, 0, $W, $H)

function Draw-ContainLayer($imgPath, $leftPct, $topPct, $widthPct, $heightPct, $flipX = $false, $clipEllipse = $false) {
    $img = [System.Drawing.Bitmap]::FromFile($imgPath)
    if ($flipX) {
        $img.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX)
    }
    $bx = $W * ($leftPct / 100.0)
    $by = $H * ($topPct / 100.0)
    $bw = $W * ($widthPct / 100.0)
    $bh = $H * ($heightPct / 100.0)

    $scale = [Math]::Min($bw / $img.Width, $bh / $img.Height)
    $dw = $img.Width * $scale
    $dh = $img.Height * $scale
    $dx = $bx + ($bw - $dw) / 2.0
    $dy = $by + ($bh - $dh) / 2.0

    $state = $g.Save()
    if ($clipEllipse) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        # clip-path: ellipse(31% 27% at 50% 47%) of box
        $cx = $bx + $bw * 0.50
        $cy = $by + $bh * 0.47
        $rx = $bw * 0.31
        $ry = $bh * 0.27
        $path.AddEllipse([float]($cx - $rx), [float]($cy - $ry), [float]($rx * 2), [float]($ry * 2))
        $g.SetClip($path)
    }
    $g.DrawImage($img, [float]$dx, [float]$dy, [float]$dw, [float]$dh)
    $g.Restore($state)
    $img.Dispose()
}

$pDir = "c:\Users\NZIN\Downloads\개인 개발분\타워디펜스\assets\parts"

# 1. 좌/우 대칭 날개 (12)
Draw-ContainLayer "$pDir\titania_wings_cape.png"  2.0  10.0 46.0 64.0 $true  $false
Draw-ContainLayer "$pDir\titania_wings_cape.png" 52.0  10.0 46.0 64.0 $false $false

# 2. 04. SD 기본 체형 소체
Draw-ContainLayer "$pDir\titania_base_body.png"   8.0   6.0 84.0 88.0 $false $false

# 3. 11. 하의 (SD 스커트)
Draw-ContainLayer "$pDir\titania_bottom_skirt.png" 34.5 54.5 31.0 37.5 $false $false

# 4. 10. 상의 (SD 비키니 탑)
Draw-ContainLayer "$pDir\titania_top_dress.png"   40.5 40.5 19.0 16.5 $false $false

# 5. 08. 공격 표정 오버레이 (테스트용)
Draw-ContainLayer "$pDir\titania_expr_serious.png" 23.0  6.0 54.0 44.5 $false $true

# 6. 09. 머리장식 (티아라 왕관)
Draw-ContainLayer "$pDir\titania_headgear.png"    28.0  1.5 44.0 24.0 $false $false

# 7. 13. 주무기 (SD 세계수 지팡이)
Draw-ContainLayer "$pDir\titania_main_weapon.png"  3.0 24.0 32.0 62.0 $false $false

$outPreview = "C:\Users\NZIN\.gemini\antigravity\brain\24a020d7-db31-4d3e-b612-879d69b02784\sd_titania_rig_preview1.png"
$canvas.Save($outPreview, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$canvas.Dispose()
Write-Output "Saved preview to $outPreview"
