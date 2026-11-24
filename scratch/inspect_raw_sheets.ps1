Add-Type -AssemblyName System.Drawing

$brain = "C:\Users\NZIN\.gemini\antigravity\brain\a9b248b5-71cd-4fef-a353-af82a1fa0bb5"
$sheets = @(
    "$brain\sheet1_head_v2_1795506389454.jpg",
    "$brain\sheet2_body_v2_1795506382526.jpg",
    "$brain\sheet3_arms_final_1795506418917.jpg",
    "$brain\sheet4_legs_weapons_1795506367940.jpg"
)

foreach ($s in $sheets) {
    $bmp = [System.Drawing.Bitmap]::FromFile($s)
    Write-Host ("=== {0} ({1}x{2}) ===" -f [System.IO.Path]::GetFileName($s), $bmp.Width, $bmp.Height)
    $bmp.Dispose()
}
