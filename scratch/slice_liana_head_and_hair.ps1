Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root 'test\incoming\char_liana\c00_complete.png'
$outDir = Join-Path $root 'test\incoming\char_liana'

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width; $h = $src.Height
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

# 1. c03_face_neutral.png (기본 표정)
$c03 = New-Chroma
for ($y = 240; $y -le 370; $y++) {
    for ($x = 440; $x -le 630; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        $lum = ($p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11)

        # 앞머리 제외 (머리카락 갈색 배제: Y < 270 부근)
        if ($y -lt 265) { continue }
        if ($y -lt 280 -and $x -lt 510) { continue } # 왼쪽 이마 덮은 앞머리
        if ($x -gt 615) { continue } # 오른쪽 옆머리

        # 눈썹, 눈꺼풀, 입, 코 선화
        $isLine = ($lum -lt 140)
        # 눈동자 및 흰자위 (X=460..605, Y=272..326)
        $isEye = ($y -ge 272 -and $y -le 326 -and ($x -ge 465 -and $x -le 528 -or $x -ge 562 -and $x -le 610))

        if ($isLine -or ($isEye -and ($lum -lt 190 -or ($p.R -gt 240 -and $p.G -gt 235 -and $p.B -gt 235)))) {
            $c03.SetPixel($x, $y, $p)
        }
    }
}
$c03.Save((Join-Path $outDir 'c03_face_neutral.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c03.Dispose()
Write-Host "Created: c03_face_neutral.png"

# 2. c02_hair_front.png (앞머리 / 옆머리)
$c02 = New-Chroma
for ($y = 100; $y -le 420; $y++) {
    for ($x = 330; $x -le 660; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        $lum = ($p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11)
        # 머리카락 색상 특성: R이 높고 B가 낮음, 피부(R>240, G>210)보다 채도/명도가 어두움
        $isSkin = ($p.R -gt 230 -and $p.G -gt 200 -and $p.B -gt 170 -and ($p.R - $p.G) -lt 35)

        # 앞머리 영역:
        # 이마 위 전체(Y < 265) + 앞머리 가닥들 + 양옆 뺨 앞 가닥
        if ($y -lt 265 -and -not $isSkin) {
            $c02.SetPixel($x, $y, $p)
        } elseif (-not $isSkin -and $lum -lt 200) {
            # 앞머리 뾰족한 가닥들 (X < 470 왼쪽 구레나룻, X > 585 오른쪽 옆머리, 또는 Y < 290)
            if ($x -lt 470 -or $x -gt 585 -or ($y -lt 290 -and $x -lt 520)) {
                $c02.SetPixel($x, $y, $p)
            }
        }
    }
}
$c02.Save((Join-Path $outDir 'c02_hair_front.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c02.Dispose()
Write-Host "Created: c02_hair_front.png"

# 3. c01_hair_back.png (뒷머리)
$c01 = New-Chroma
# 머리 외곽선 실루엣 전체를 채우고, 얼굴 피부 영역은 뒷머리 볼륨으로 둥글게 채움
for ($y = 100; $y -le 430; $y++) {
    for ($x = 330; $x -le 660; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        # 목과 쇄골 아래 제외 (Y > 410 및 X > 450)
        if ($y -gt 410 -and $x -gt 470 -and $x -lt 560) { continue }

        # 얼굴 앞면(Y > 265 및 X = 470..590)은 뒷머리 뒤로 들어가므로
        # 얼굴에 가려진 뒷머리 볼륨 채우기 (머리카락 기본 베이스 색: R=155, G=105, B=75)
        $isSkin = ($p.R -gt 230 -and $p.G -gt 200 -and $p.B -gt 170)
        if ($isSkin) {
            $c01.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, 150, 100, 70))
        } else {
            $c01.SetPixel($x, $y, $p)
        }
    }
}
$c01.Save((Join-Path $outDir 'c01_hair_back.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c01.Dispose()
Write-Host "Created: c01_hair_back.png"

$src.Dispose()

