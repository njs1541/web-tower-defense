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

# =========================================================================
# 1. c14_weapon_sub.png (나무 방패)
# X: 570..800, Y: 420..760
# =========================================================================
$c14 = New-Chroma
# 방패 영역 마스크 (사각/오각형 다각형 영역)
# 방패 상단 꼭지점: (700, 426)
# 방패 좌상: (590, 465), 우상: (780, 445)
# 방패 좌측: (602, 570), 우측: (795, 550)
# 방패 하단 꼭지점: (632, 755)
# 뒤로 삐져나온 칼집(X < 600 부근)과 몸통을 제외하고 방패만 추출
for ($y = 420; $y -le 760; $y++) {
    for ($x = 585; $x -le 805; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        # 방패 외곽선 내부 판정 (방패는 금속 테두리와 볼트가 있음)
        # 왼쪽 칼집 제외: Y > 540에서 X < 610인 칼집 제외
        if ($y -gt 540 -and $x -lt 605) { continue }
        # 상의 튜닉 및 흉갑 제외: X < 592
        if ($x -lt 590) { continue }

        # 방패의 오른쪽 외곽선 바깥 제외
        if ($x -gt 798) { continue }
        if ($y -gt 720 -and $x -gt 680) { continue }

        $c14.SetPixel($x, $y, $p)
    }
}
$c14.Save((Join-Path $outDir 'c14_weapon_sub.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c14.Dispose()
Write-Host "Created: c14_weapon_sub.png"

# =========================================================================
# 2. c13_weapon_main.png (강철 장검)
# X: 110..420, Y: 600..950
# =========================================================================
$c13 = New-Chroma
# 칼날 중심축: (120, 930) -> (320, 680)
# 가드: (285, 660) ~ (355, 750)
# 손잡이: (330, 670) ~ (390, 620)
# 폼멜: (390, 625)
for ($y = 600; $y -le 950; $y++) {
    for ($x = 110; $x -le 420; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        # 피부색(손가락) 및 바지/부츠 제외
        # 손가락 피부: R > 230, G > 180, B > 160
        $isSkin = ($p.R -gt 220 -and $p.G -gt 170 -and $p.B -gt 150 -and $p.R -gt $p.G)
        $isPantsOrBoots = ($x -gt 400 -or ($y -gt 780 -and $x -gt 380))

        if ($isPantsOrBoots) { continue }

        if ($isSkin) {
            # 손가락이 가리고 있던 손잡이 부위는 가죽 래핑 브라운 색으로 완성!
            if ($x -ge 330 -and $x -le 380 -and $y -ge 625 -and $y -le 690) {
                # 손잡이 가죽 브라운 (R=95, G=60, B=45)
                $c13.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, 105, 65, 50))
            }
            continue
        }

        # 순수 칼(칼날, 가드, 폼멜, 손잡이 노출부) 복사
        $c13.SetPixel($x, $y, $p)
    }
}
$c13.Save((Join-Path $outDir 'c13_weapon_main.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c13.Dispose()
Write-Host "Created: c13_weapon_main.png"

# =========================================================================
# 3. c03_face_neutral.png (기본 표정)
# 눈썹, 눈, 코, 입 (얼굴 피부와 앞머리 제외)
# =========================================================================
$c03 = New-Chroma
for ($y = 250; $y -le 370; $y++) {
    for ($x = 445; $x -le 625; $x++) {
        $p = $src.GetPixel($x, $y)
        $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($isGreen) { continue }

        $lum = ($p.R * 0.3 + $p.G * 0.59 + $p.B * 0.11)

        # 앞머리 제외: Y < 265인 윗부분 갈색 머리 배제
        if ($y -lt 265) { continue }
        # 이마 위쪽 머리카락 갈색 가닥 배제
        if ($y -lt 275 -and $x -lt 510) { continue }
        if ($x -gt 610) { continue } # 오른쪽 옆머리 배제

        # 1) 어두운 선화 (눈썹, 눈꺼풀, 입, 콧날): lum < 140
        $isLine = ($lum -lt 140)
        # 2) 눈동자 홍채 및 하이라이트 (Y: 275..325)
        $isEyeIris = ($y -ge 275 -and $y -le 325 -and $lum -lt 190 -and ($x -le 530 -or $x -ge 565))
        $isEyeWhite = ($y -ge 280 -and $y -le 320 -and $p.R -gt 240 -and $p.G -gt 235 -and $p.B -gt 235 -and ($x -le 535 -or $x -ge 565))

        if ($isLine -or $isEyeIris -or $isEyeWhite) {
            $c03.SetPixel($x, $y, $p)
        }
    }
}
$c03.Save((Join-Path $outDir 'c03_face_neutral.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$c03.Dispose()
Write-Host "Created: c03_face_neutral.png"

$src.Dispose()

