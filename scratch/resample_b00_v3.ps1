Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root "test\incoming\body_human\b00_master.png"
$backupPath = Join-Path $root "test\incoming\body_human\b00_master_raw_2k.png"

# 백업 파일 확인
if (-not (Test-Path -LiteralPath $backupPath)) {
    Copy-Item -LiteralPath $srcPath -Destination $backupPath -Force
    Write-Host "Backed up 2K raw image to $backupPath"
}

# 2K 원본 파일 열기
$fs = New-Object System.IO.FileStream($backupPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read)
$origImg = [System.Drawing.Image]::FromStream($fs)
$w = $origImg.Width
$h = $origImg.Height
Write-Host "Loaded original image: ${w}x${h}"

# 편집용 32bpp 비트맵으로 복사
$cleanBmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gClean = [System.Drawing.Graphics]::FromImage($cleanBmp)
$gClean.DrawImage($origImg, 0, 0, $w, $h)

# 배경색: 모서리 픽셀 색상 (R:8, G:239, B:19)
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 8, 239, 19))
# 우측 하단 (x >= 1500, y >= 1500) 티끌 제거
$gClean.FillRectangle($bgBrush, 1500, 1500, ($w - 1500), ($h - 1500))
$gClean.Dispose()
$bgBrush.Dispose()

# 원본 스트림 닫기
$origImg.Dispose()
$fs.Close()
$fs.Dispose()

# 1024x1024 고품질 리샘플링 생성
$targetW = 1024
$targetH = 1024
$finalBmp = New-Object System.Drawing.Bitmap($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($finalBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$g.DrawImage($cleanBmp, 0, 0, $targetW, $targetH)
$g.Dispose()
$cleanBmp.Dispose()

# 저장
$finalBmp.Save($srcPath, [System.Drawing.Imaging.ImageFormat]::Png)
$finalBmp.Dispose()

Write-Host "Success! Cleaned and resampled to 1024x1024: $srcPath"

