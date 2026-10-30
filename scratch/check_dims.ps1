Add-Type -AssemblyName System.Drawing
$fullA = Resolve-Path "assets\ref_sylvana_sheet_a.jpg"
$fullB = Resolve-Path "assets\ref_sylvana_sheet_b.jpg"
$imgA = [System.Drawing.Image]::FromFile($fullA)
$imgB = [System.Drawing.Image]::FromFile($fullB)
Write-Output "Sheet A: $($imgA.Width)x$($imgA.Height)"
Write-Output "Sheet B: $($imgB.Width)x$($imgB.Height)"
$imgA.Dispose()
$imgB.Dispose()

