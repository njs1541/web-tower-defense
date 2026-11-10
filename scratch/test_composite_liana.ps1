Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$bodyDir = Join-Path $root 'test\incoming\body_human'
$charDir = Join-Path $root 'test\incoming\char_liana'

$c00 = [System.Drawing.Bitmap]::FromFile((Join-Path $charDir 'c00_complete.png'))
$w = $c00.Width; $h = $c00.Height

# 올바른 의상 착용 레이어 순서 (바디 맨살 위에 옷을 입힘!)
# 1. c01 뒷머리 (머리 뒤)
# 2. b06 먼 팔 위 + c10 먼 소매
# 3. b07 먼 팔 아래
# 4. c14 방패
# 5. c08 튜닉 뒷자락
# 6. b09 먼 다리 + c12 먼 다리 의상
# 7. b08 가까운 다리 + c11 가까운 다리 의상
# 8. b03 골반 (맨살)
# 9. b02 상체 (맨살)
# 10. c06 상의 (흉갑)
# 11. c07 튜닉 앞자락 (벨트 + 앞단: 흉갑 아랫단과 골반을 완벽하게 덮음!)
# 12. b01 머리 소체
# 13. c03 표정
# 14. c02 앞머리
# 15. c13 칼
# 16. b04 가까운 팔 위 + c09 가까운 소매
# 17. b05 가까운 팔 아래 (손이 칼 손잡이를 감쌈)

$layers = @(
    (Join-Path $charDir 'c01_hair_back.png'),
    (Join-Path $bodyDir 'b06_arm_far_upper.png'),
    (Join-Path $charDir 'c10_sleeve_far.png'),
    (Join-Path $bodyDir 'b07_arm_far_lower.png'),
    (Join-Path $charDir 'c14_weapon_sub.png'),
    (Join-Path $charDir 'c08_skirt_back.png'),
    (Join-Path $bodyDir 'b09_leg_far.png'),
    (Join-Path $charDir 'c12_pants_far.png'),
    (Join-Path $bodyDir 'b08_leg_near.png'),
    (Join-Path $charDir 'c11_pants_near.png'),
    (Join-Path $bodyDir 'b03_pelvis.png'),
    (Join-Path $bodyDir 'b02_torso_upper.png'),
    (Join-Path $charDir 'c06_top.png'),
    (Join-Path $charDir 'c07_skirt_front.png'),
    (Join-Path $bodyDir 'b01_head_base.png'),
    (Join-Path $charDir 'c03_face_neutral.png'),
    (Join-Path $charDir 'c02_hair_front.png'),
    (Join-Path $charDir 'c13_weapon_main.png'),
    (Join-Path $bodyDir 'b04_arm_near_upper.png'),
    (Join-Path $charDir 'c09_sleeve_near.png'),
    (Join-Path $bodyDir 'b05_arm_near_lower.png')
)

$composite = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($composite)
$g.Clear([System.Drawing.Color]::FromArgb(255, 8, 239, 19))

foreach ($path in $layers) {
    if (-not (Test-Path $path)) {
        Write-Host "Warning: Missing $path"
        continue
    }
    $partBmp = [System.Drawing.Bitmap]::FromFile($path)
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $p = $partBmp.GetPixel($x, $y)
            $isGreen = ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
            if (-not $isGreen -and $p.A -gt 100) {
                $composite.SetPixel($x, $y, $p)
            }
        }
    }
    $partBmp.Dispose()
    Write-Host ("Composited: " + [System.IO.Path]::GetFileName($path))
}

$g.Dispose()
$outCompositePath = Join-Path $root 'scratch\liana_composite_assembled.png'
$composite.Save($outCompositePath, [System.Drawing.Imaging.ImageFormat]::Png)
$composite.Dispose()
$c00.Dispose()

Write-Host "Corrected layer composite saved to: $outCompositePath"
