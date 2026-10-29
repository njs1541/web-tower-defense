Add-Type -AssemblyName System.Drawing

$srcStanding = "C:\Users\NZIN\.gemini\antigravity\brain\24a020d7-db31-4d3e-b612-879d69b02784\titania_standing_illustration_1793252782043.jpg"
$srcSheet = "C:\Users\NZIN\.gemini\antigravity\brain\24a020d7-db31-4d3e-b612-879d69b02784\titania_modular_rigging_reference_sheet_1793252867188.jpg"

$dstStandingJpg = "c:\Users\NZIN\Downloads\개인 개발분\타워디펜스\assets\char_titania.jpg"
$dstSheetJpg = "c:\Users\NZIN\Downloads\개인 개발분\타워디펜스\assets\ref_titania_sheet.jpg"

Copy-Item $srcStanding $dstStandingJpg -Force
Copy-Item $srcSheet $dstSheetJpg -Force

# 01~15 공식 템플릿 슬라이스 스펙 (상단 38px 라벨 바 & 하단 안내 라벨 영역 제외한 순수 내부 알맹이 영역)
$sliceSpecs = @(
    @{ id = "01"; key = "front_core"; x = 3.1; y = 14.2; w = 21.3; h = 42.5; absent = $false },
    @{ id = "04"; key = "base_body"; x = 74.1; y = 14.2; w = 21.3; h = 42.5; absent = $false },
    @{ id = "05"; key = "expr_neutral"; x = 3.1; y = 67.2; w = 8.15; h = 25.0; absent = $false },
    @{ id = "08"; key = "expr_serious"; x = 31.7; y = 67.2; w = 8.15; h = 25.0; absent = $false },
    @{ id = "09"; key = "headgear"; x = 43.2; y = 67.2; w = 6.68; h = 25.0; absent = $false },
    @{ id = "10"; key = "top_dress"; x = 51.0; y = 67.2; w = 6.68; h = 25.0; absent = $false },
    @{ id = "11"; key = "bottom_skirt"; x = 58.9; y = 67.2; w = 6.68; h = 25.0; absent = $false },
    @{ id = "12"; key = "wings_cape"; x = 66.7; y = 67.2; w = 6.68; h = 25.0; absent = $false },
    @{ id = "13"; key = "main_weapon"; x = 74.6; y = 67.2; w = 6.68; h = 25.0; absent = $false },
    @{ id = "14"; key = "sub_weapon"; x = 82.5; y = 67.2; w = 6.68; h = 25.0; absent = $true },
    @{ id = "15"; key = "underwear"; x = 90.3; y = 67.2; w = 7.66; h = 25.0; absent = $true }
)

function Export-CroppedTransparentPng($srcBmp, $rx, $ry, $rw, $rh, $outFile) {
    $cropBmp = New-Object System.Drawing.Bitmap($rw, $rh, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($cropBmp)
    $srcRect = New-Object System.Drawing.Rectangle($rx, $ry, $rw, $rh)
    $dstRect = New-Object System.Drawing.Rectangle(0, 0, $rw, $rh)
    $g.DrawImage($srcBmp, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    # 빠른 외곽 배경 투명화 (LockBits 대신 안전하고 빠른 픽셀 스캔 또는 MakeTransparent)
    $rect = New-Object System.Drawing.Rectangle(0, 0, $rw, $rh)
    $bmpData = $cropBmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $bytes = New-Object byte[] ($rw * $rh * 4)
    [System.Runtime.InteropServices.Marshal]::Copy($bmpData.Scan0, $bytes, 0, $bytes.Length)

    $visited = New-Object byte[] ($rw * $rh)
    $queue = New-Object int[] ($rw * $rh)
    $head = 0; $tail = 0

    for ($x = 0; $x -lt $rw; $x++) {
        $queue[$tail++] = $x; $visited[$x] = 1
        $bot = ($rh - 1) * $rw + $x
        if ($visited[$bot] -eq 0) { $queue[$tail++] = $bot; $visited[$bot] = 1 }
    }
    for ($y = 0; $y -lt $rh; $y++) {
        $left = $y * $rw
        if ($visited[$left] -eq 0) { $queue[$tail++] = $left; $visited[$left] = 1 }
        $right = $y * $rw + ($rw - 1)
        if ($visited[$right] -eq 0) { $queue[$tail++] = $right; $visited[$right] = 1 }
    }

    $threshold = 232
    while ($head -lt $tail) {
        $cur = $queue[$head++]
        $cx = $cur % $rw
        $cy = [int][Math]::Floor($cur / $rw)
        $idx = $cur * 4

        $b = $bytes[$idx]
        $gr = $bytes[$idx + 1]
        $r = $bytes[$idx + 2]

        $minC = [Math]::Min($r, [Math]::Min($gr, $b))
        $maxC = [Math]::Max($r, [Math]::Max($gr, $b))
        # 피부색/분홍머리는 R - G >= 14 이므로 절대 보호!
        # 순백/연회색 배경(R,G,B 모두 234 이상이고 편차 16 이하) 또는 04번 슬롯 순수 연노랑 배경(R>=250, G>=246, B>=222, R-G<=7)만 투명화!
        $isWhiteOrGrayBg = ($minC -ge 234) -and (($maxC - $minC) -le 16)
        $isYellowSlotBg = ($r -ge 248) -and ($gr -ge 244) -and ($b -ge 220) -and ([Math]::Abs([int]$r - [int]$gr) -le 7)
        # 외곽 15px 테두리 구간에서만 가이드 점선 브릿지 허용 (캐릭터 내부 침범 완벽 차단)
        $isEdgeDashBridge = (($cx -lt 18) -or ($cx -gt ($rw - 18))) -and ($r -ge 215) -and ($gr -ge 165) -and ($b -ge 155)
        $isBg = $isWhiteOrGrayBg -or $isYellowSlotBg -or $isEdgeDashBridge

        if ($isBg) {
            $bytes[$idx + 3] = 0
            if ($cx + 1 -lt $rw) { $np = $cur + 1; if ($visited[$np] -eq 0) { $visited[$np] = 1; $queue[$tail++] = $np } }
            if ($cx - 1 -ge 0) { $np = $cur - 1; if ($visited[$np] -eq 0) { $visited[$np] = 1; $queue[$tail++] = $np } }
            if ($cy + 1 -lt $rh) { $np = $cur + $rw; if ($visited[$np] -eq 0) { $visited[$np] = 1; $queue[$tail++] = $np } }
            if ($cy - 1 -ge 0) { $np = $cur - $rw; if ($visited[$np] -eq 0) { $visited[$np] = 1; $queue[$tail++] = $np } }
        }
    }

    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $bmpData.Scan0, $bytes.Length)
    $cropBmp.UnlockBits($bmpData)
    $cropBmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropBmp.Dispose()
}

# 1) 전신 일러스트 투명 PNG 추출
$stBmp = New-Object System.Drawing.Bitmap($dstStandingJpg)
Export-CroppedTransparentPng $stBmp 0 0 $stBmp.Width $stBmp.Height "c:\Users\NZIN\Downloads\개인 개발분\타워디펜스\assets\char_titania.png"
$stBmp.Dispose()
Write-Output "✅ STEP 3 완료: 전신 일러스트 투명화 -> assets/char_titania.png"

# 2) 01~15 설정시트 파츠 슬라이싱 및 미보유('없음') 항목 처리
$shBmp = New-Object System.Drawing.Bitmap($dstSheetJpg)
$sw = $shBmp.Width; $sh = $shBmp.Height

foreach ($sp in $sliceSpecs) {
    if ($sp.absent) {
        Write-Output "🚫 슬롯 $($sp.id) [$($sp.key)] -> '없음 (NONE - 미착용/미보유)' 상태 확인됨 (파츠 파일 생성 건너뜀, null 매핑)"
        continue
    }
    $rx = [int][Math]::Round(($sp.x / 100.0) * $sw)
    $ry = [int][Math]::Round(($sp.y / 100.0) * $sh)
    $rw = [int][Math]::Round(($sp.w / 100.0) * $sw)
    $rh = [int][Math]::Round(($sp.h / 100.0) * $sh)
    $outPart = "c:\Users\NZIN\Downloads\개인 개발분\타워디펜스\assets\parts\titania_$($sp.key).png"
    Export-CroppedTransparentPng $shBmp $rx $ry $rw $rh $outPart
    Write-Output "✅ 슬롯 $($sp.id) [$($sp.key)] 투명 파츠 분리 완료 -> assets/parts/titania_$($sp.key).png ($($rw)x$($rh))"
}
$shBmp.Dispose()
