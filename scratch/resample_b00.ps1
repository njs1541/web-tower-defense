Add-Type -AssemblyName System.Drawing

$srcPath = Resolve-Path "test\incoming\body_human\b00_master.png"
$backupPath = Join-Path (Split-Path $srcPath) "b00_master_raw_2k.png"

# 1. 2K 원본 백업
if (-not (Test-Path $backupPath)) {
    Copy-Item $srcPath $backupPath
    Write-Host "Backed up 2K raw image to: $backupPath"
}

# 2. 이미지 로드 및 노이즈 티끌 클리닝
$srcBmp = [System.Drawing.Bitmap]::FromFile($backupPath)
$w = $srcBmp.Width
$h = $srcBmp.Height

# 배경색 감지 (0,0 모서리 픽셀 색상)
$bgColor = $srcBmp.GetPixel(0, 0)
$bgBrush = New-Object System.Drawing.SolidBrush($bgColor)

# 캐릭터 본체 영역 외곽(우측 하단 x > 1600, y > 1600 영역의 아티팩트 티끌) 제거
$gSrc = [System.Drawing.Graphics]::FromImage($srcBmp)
$gSrc.FillRectangle($bgBrush, 1500, 1500, ($w - 1500), ($h - 1500))
$gSrc.Dispose()

# 3. 1024x1024 고품질 리샘플링
$targetW = 1024
$targetH = 1024
$destBmp = New-Object System.Drawing.Bitmap($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$g.DrawImage($srcBmp, 0, 0, $targetW, $targetH)
$g.Dispose()
$srcBmp.Dispose()
$bgBrush.Dispose()

# 4. 저장 (test/incoming/body_human/b00_master.png)
$destBmp.Save($srcPath, [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()

Write-Host "Successfully resampled to 1024x1024 and saved to: $srcPath"

