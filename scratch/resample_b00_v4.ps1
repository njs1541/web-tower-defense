Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path
$srcPath = Join-Path $root "test\incoming\body_human\b00_master.png"
$backupPath = Join-Path $root "test\incoming\body_human\b00_master_raw_2k.png"
$tempPath = Join-Path $root "test\incoming\body_human\b00_master_1024_temp.png"

# 2K 원본 열기
$rawBmp = [System.Drawing.Bitmap]::FromFile($backupPath)
$w = $rawBmp.Width
$h = $rawBmp.Height

# 1024x1024 생성
$destBmp = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($rawBmp, 0, 0, 1024, 1024)

# 우측 하단 아티팩트 티끌(1024 기준: x >= 750, y >= 750 부근) 제거
# 배경색: R:8, G:239, B:19
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 8, 239, 19))
$g.FillRectangle($bgBrush, 750, 750, 274, 274)

$g.Dispose()
$bgBrush.Dispose()
$rawBmp.Dispose()

# 임시 파일로 먼저 저장
if (Test-Path $tempPath) { Remove-Item $tempPath -Force }
$destBmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()

# 원본 교체
Move-Item -LiteralPath $tempPath -Destination $srcPath -Force
Write-Host "Done: 1024x1024 replaced safely."

