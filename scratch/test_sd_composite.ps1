Add-Type -AssemblyName System.Drawing

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
