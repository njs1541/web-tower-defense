Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap(2048, 1152)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255))
$g.FillRectangle($whiteBrush, 0, 0, 2048, 1152)

$fontTitle = New-Object System.Drawing.Font("Malgun Gothic", 26, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Malgun Gothic", 12, [System.Drawing.FontStyle]::Bold)
$fontSlotTitle = New-Object System.Drawing.Font("Malgun Gothic", 11.5, [System.Drawing.FontStyle]::Bold)
$fontSlotSub = New-Object System.Drawing.Font("Malgun Gothic", 9.5, [System.Drawing.FontStyle]::Regular)
$fontAbsent = New-Object System.Drawing.Font("Malgun Gothic", 15, [System.Drawing.FontStyle]::Bold)
$fontSection = New-Object System.Drawing.Font("Malgun Gothic", 15, [System.Drawing.FontStyle]::Bold)

$sfCenter = New-Object System.Drawing.StringFormat
$sfCenter.Alignment = [System.Drawing.StringAlignment]::Center
$sfCenter.LineAlignment = [System.Drawing.StringAlignment]::Center

$darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 23, 42))
$mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(71, 85, 105))
$redBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 38, 38))
$goldTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 83, 9))

$g.DrawString("숲의 종족 (FOREST FOLK) 3종 SD 아바타 소체 리깅 & 파츠 설정 시트 (2.5~3.0등신 SD 규격)", $fontTitle, $darkBrush, 1024, 42, $sfCenter)
$g.DrawString("SD RIGGING AVATAR SPEC: TALL SD (3.0등신 장신 SD 아바타 소체 규격 - 2.8~3.0 Heads Tall Chibi SD)", $fontSub, $mutedBrush, 60, 78)
$g.DrawString("※ [숲의 종족 영구 신체]: 결정체 엘프 뾰족귀는 01~04 SD 뷰에 영구 결합 유지 (둥근 인간 귀 변형 금지)", $fontSub, $redBrush, 1200, 78)

function Draw-SlotBox($x, $y, $w, $h, $title, $sub, $isHighlight, $isAbsent) {
    $bgCol = if ($isAbsent) { [System.Drawing.Color]::FromArgb(241, 245, 249) } else { [System.Drawing.Color]::FromArgb(255, 255, 255) }
    $borderCol = if ($isAbsent) { [System.Drawing.Color]::FromArgb(148, 163, 184) } elseif ($isHighlight) { [System.Drawing.Color]::FromArgb(245, 158, 11) } else { [System.Drawing.Color]::FromArgb(203, 213, 225) }
    $headerCol = if ($isAbsent) { [System.Drawing.Color]::FromArgb(226, 232, 240) } elseif ($isHighlight) { [System.Drawing.Color]::FromArgb(254, 243, 199) } else { [System.Drawing.Color]::FromArgb(241, 245, 249) }

    $bgB = New-Object System.Drawing.SolidBrush($bgCol)
    $hdrB = New-Object System.Drawing.SolidBrush($headerCol)
    $pen = New-Object System.Drawing.Pen($borderCol, $(if ($isHighlight) { 2.5 } else { 1.5 }))

    $g.FillRectangle($bgB, $x, $y, $w, $h)
    $g.FillRectangle($hdrB, $x, $y, $w, 38)
    $g.DrawRectangle($pen, $x, $y, $w, $h)
    $g.DrawLine($pen, $x, ($y + 38), ($x + $w), ($y + 38))

    $tBrush = if ($isAbsent) { $mutedBrush } elseif ($isHighlight) { $goldTextBrush } else { $darkBrush }
    $rectHdr = New-Object System.Drawing.RectangleF($x, $y, $w, 38)
    $g.DrawString($title, $fontSlotTitle, $tBrush, $rectHdr, $sfCenter)

    if ($isAbsent) {
        $rectCenter1 = New-Object System.Drawing.RectangleF($x, ($y + $h/2 - 28), $w, 30)
        $rectCenter2 = New-Object System.Drawing.RectangleF($x, ($y + $h/2 + 4), $w, 24)
        $g.DrawString("없음 (NONE)", $fontAbsent, $redBrush, $rectCenter1, $sfCenter)
        $g.DrawString("[미착용 / 미보유]", $fontSlotSub, $mutedBrush, $rectCenter2, $sfCenter)
    } elseif ($sub -ne "") {
        $rectSub = New-Object System.Drawing.RectangleF($x, ($y + $h - 24), $w, 20)
        $g.DrawString($sub, $fontSlotSub, $mutedBrush, $rectSub, $sfCenter)
    }
}

$topY = 120; $topH = 560; $slotW = 445; $startX = 60; $gap = 38
Draw-SlotBox ($startX + ($slotW + $gap) * 0) $topY $slotW $topH "01. 정면 (SD Front)" "[2.8~3등신 SD 전신 풀 착장 정면]" $false $false
Draw-SlotBox ($startX + ($slotW + $gap) * 1) $topY $slotW $topH "02. 측면 (SD Side)" "[SD 정면과 1:1 눈금 일치 측면]" $false $false
Draw-SlotBox ($startX + ($slotW + $gap) * 2) $topY $slotW $topH "03. 후면 (SD Back)" "[SD 망토/날개/뒷모습 실측]" $false $false
Draw-SlotBox ($startX + ($slotW + $gap) * 3) $topY $slotW $topH "04. 기본 체형 (SD Base Body)" "[TALL SD 소체 / 의상 완전 탈의]" $true $false

# TALL SD (3.0등신 Chibi) 기준 눈금 마커 (박스 바깥 여백 및 슬롯 간격에만 표시하여 파츠 오염 방지)
$tickPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 239, 68, 68), 2.0)
$fontTick = New-Object System.Drawing.Font("Malgun Gothic", 8.5, [System.Drawing.FontStyle]::Bold)
$guideYs = @(185, 355, 440, 505, 650)
$guideNames = @("Head", "Chin", "Waist", "Hips", "Base")
for ($gi = 0; $gi -lt $guideYs.Count; $gi++) {
    $gy = $guideYs[$gi]
    $g.DrawLine($tickPen, ($startX - 14), $gy, $startX, $gy)
    $g.DrawString($guideNames[$gi], $fontTick, $redBrush, ($startX - 52), ($gy - 7))
    for ($s = 0; $s -lt 3; $s++) {
        $gx1 = $startX + $slotW * ($s + 1) + $gap * $s + 4
        $gx2 = $gx1 + $gap - 8
        $g.DrawLine($tickPen, $gx1, $gy, $gx2, $gy)
    }
}

$expY = 730; $expH = 370; $subExpW = 175; $subExpGap = 20
$g.DrawString("표정 시트 (Facial Expressions 05~08)", $fontSection, $darkBrush, $startX, ($expY - 28))
Draw-SlotBox ($startX + ($subExpW + $subExpGap) * 0) $expY $subExpW $expH "05. 기본 무표정" "[Neutral]" $false $false
Draw-SlotBox ($startX + ($subExpW + $subExpGap) * 1) $expY $subExpW $expH "06. 밝은 미소" "[Happy Smile]" $false $false
Draw-SlotBox ($startX + ($subExpW + $subExpGap) * 2) $expY $subExpW $expH "07. 자신감" "[Confident]" $false $false
Draw-SlotBox ($startX + ($subExpW + $subExpGap) * 3) $expY $subExpW $expH "08. 진지한 결의" "[Serious]" $false $false

$costStartX = 880; $costSlotW = 145; $costGap = 16
$g.DrawString("리깅 파츠 & 복장·속옷 분해도 (Modular Rig Parts 09~15 : 미보유 항목은 '없음' 표기)", $fontSection, $darkBrush, $costStartX, ($expY - 28))
Draw-SlotBox ($costStartX + ($costSlotW + $costGap) * 0) $expY $costSlotW $expH "09. 복장 : 머리 장식" "[Headgear / Halo]" $false $false
Draw-SlotBox ($costStartX + ($costSlotW + $costGap) * 1) $expY $costSlotW $expH "10. 복장 : 상의" "[Top / Armor]" $false $false
Draw-SlotBox ($costStartX + ($costSlotW + $costGap) * 2) $expY $costSlotW $expH "11. 복장 : 하의" "[Bottom / Skirt]" $false $false
Draw-SlotBox ($costStartX + ($costSlotW + $costGap) * 3) $expY $costSlotW $expH "12. 복장 : 외투 / 날개" "[Wings / Cape]" $false $false
Draw-SlotBox ($costStartX + ($costSlotW + $costGap) * 4) $expY $costSlotW $expH "13. 주무기 파츠" "[Primary Weapon]" $false $false
# 14번 보조무기: 없음(NONE) 설정 테스트!
Draw-SlotBox ($costStartX + ($costSlotW + $costGap) * 5) $expY $costSlotW $expH "14. 보조무기 / 구체" "[Sub-Weapon / Orb]" $false $true
# 15번 속옷: 없음(NONE - 미착용) 설정 테스트!
Draw-SlotBox ($costStartX + ($costSlotW + $costGap) * 6) $expY ($costSlotW + 20) $expH "15. 복장 : 속옷" "[Underwear / Inner]" $true $true

$outPath = "c:\Users\NZIN\Downloads\개인 개발분\타워디펜스\assets\forest_tall_model_sheet_template_2048x1152.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output "Saved template: $outPath"

