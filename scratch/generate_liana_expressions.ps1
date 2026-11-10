Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$outDir = Join-Path $root 'test\incoming\char_liana'
$c03Path = Join-Path $outDir 'c03_face_neutral.png'

$c03 = [System.Drawing.Bitmap]::FromFile($c03Path)
$w = $c03.Width; $h = $c03.Height
$bgColor = [System.Drawing.Color]::FromArgb(255, 8, 239, 19)

function New-Chroma() {
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $b = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($b, 0, 0, $w, $h)
    $b.Dispose()
    $g.Dispose()
    return $bmp
}

# 1. c04_face_blink.png (눈 감은 표정)
# c03에서 눈동자/흰자위를 제외하고, 감은 눈 호선(⌒ ⌒)을 짙은 갈색 라인으로 그림
$c04 = New-Chroma
$eyeLineColor = [System.Drawing.Color]::FromArgb(255, 75, 45, 35) # 원본 눈썹/아이라인 색

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $c03.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        # 눈동자 내부(Y=275..325, X=470..605)는 제외하여 뜬 눈 제거
        $isEyeBall = ($y -ge 278 -and $y -le 322 -and ($x -ge 470 -and $x -le 525 -or $x -ge 565 -and $x -le 605))
        if (-not $isEyeBall) {
            $c04.SetPixel($x, $y, $p) # 눈썹, 코, 입 유지
        }
    }
}

# 감은 눈 호선 (⌒ ⌒) 그리기
$g = [System.Drawing.Graphics]::FromImage($c04)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$pen = New-Object System.Drawing.Pen($eyeLineColor, 3.5)

# 왼쪽 눈 감은 호선 (중심 497, Y=302, 폭 34px)
$g.DrawArc($pen, 480, 290, 36, 22, 190, 160)
# 오른쪽 눈 감은 호선 (중심 585, Y=302, 폭 30px)
$g.DrawArc($pen, 570, 290, 32, 22, 190, 160)

$pen.Dispose()
$g.Dispose()
$c04.Save((Join-Path $outDir 'c04_face_blink.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c04.Dispose()
Write-Host "Created: c04_face_blink.png"

# 2. c05_face_attack.png (공격 표정: 찌푸린 눈썹 + 기합 넣는 벌린 입)
$c05 = New-Chroma
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $c03.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        # 입 부위(Y=340..370, X=520..580)는 제외하고 기합 입으로 대체
        $isMouth = ($y -ge 340 -and $y -le 365 -and $x -ge 520 -and $x -le 580)
        if (-not $isMouth) {
            $c05.SetPixel($x, $y, $p)
        }
    }
}

# 기합 입 그리기 (D 형태 벌린 입: 외곽 갈색, 내부 짙은 레드/치아)
$g = [System.Drawing.Graphics]::FromImage($c05)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# 입 내부 (어두운 루비 레드)
$mouthBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 140, 45, 45))
$mouthPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$mouthPath.AddClosedCurve(@(
    [System.Drawing.Point]::new(534, 345),
    [System.Drawing.Point]::new(566, 345),
    [System.Drawing.Point]::new(560, 362),
    [System.Drawing.Point]::new(540, 360)
))
$g.FillPath($mouthBrush, $mouthPath)

# 입 외곽선
$mouthPen = New-Object System.Drawing.Pen($eyeLineColor, 2.8)
$g.DrawPath($mouthPen, $mouthPath)

$mouthPen.Dispose()
$mouthPath.Dispose()
$mouthBrush.Dispose()
$g.Dispose()

$c05.Save((Join-Path $outDir 'c05_face_attack.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c05.Dispose()
Write-Host "Created: c05_face_attack.png"

$c03.Dispose()

