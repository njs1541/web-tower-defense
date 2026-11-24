Add-Type -AssemblyName System.Drawing

$brain = "C:\Users\NZIN\.gemini\antigravity\brain\a9b248b5-71cd-4fef-a353-af82a1fa0bb5"

# 1. Sheet 1: Check ear position on face_neutral (Cell 1,0: x=40..314, y=655..957)
$s1 = [System.Drawing.Bitmap]::FromFile("$brain\sheet1_head_v2_1795506389454.jpg")
Write-Host "--- Sheet 1 Face_Neutral Left Profile (y=750..900) ---"
for ($y = 760; $y -le 910; $y += 10) {
    $firstX = -1
    for ($x = 35; $x -le 150; $x++) {
        $p = $s1.GetPixel($x, $y)
        if (-not ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)) { $firstX = $x; break }
    }
    # Check where the inner ear/jaw boundary dark line is around x=70..115
    $darkXs = @()
    for ($x = 70; $x -le 125; $x++) {
        $p = $s1.GetPixel($x, $y)
        $lum = 0.3 * $p.R + 0.59 * $p.G + 0.11 * $p.B
        if ($lum -lt 110) { $darkXs += $x }
    }
    Write-Host ("  y={0}: firstX={1}, darkLineXs={2}" -f $y, $firstX, ($darkXs -join ","))
}

Write-Host "--- Sheet 1 Head_Base Neck Profile (y=340..455) ---"
for ($y = 340; $y -le 455; $y += 10) {
    $x0 = -1; $x1 = -1
    for ($x = 40; $x -le 340; $x++) {
        $p = $s1.GetPixel($x, $y)
        if (-not ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)) {
            if ($x0 -lt 0) { $x0 = $x }
            $x1 = $x
        }
    }
    Write-Host ("  y={0}: x=[{1}..{2}] w={3}" -f $y, $x0, $x1, ($x1 - $x0 + 1))
}
$s1.Dispose()

# 2. Sheet 3: Check arm_near_lower (Cell 0,1: x=637..856, y=140..426) and arm_far_lower (Cell 1,1: x=617..889, y=639..865)
$s3 = [System.Drawing.Bitmap]::FromFile("$brain\sheet3_arms_final_1795506418917.jpg")
Write-Host "--- Sheet 3 arm_near_lower Top Cap (y=140..230) ---"
for ($y = 140; $y -le 230; $y += 10) {
    $x0 = -1; $x1 = -1; $darkXs = @()
    for ($x = 635; $x -le 860; $x++) {
        $p = $s3.GetPixel($x, $y)
        if (-not ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)) {
            if ($x0 -lt 0) { $x0 = $x }
            $x1 = $x
            $lum = 0.3 * $p.R + 0.59 * $p.G + 0.11 * $p.B
            if ($lum -lt 135) { $darkXs += $x }
        }
    }
    Write-Host ("  y={0}: x=[{1}..{2}] dark={3}" -f $y, $x0, $x1, ($darkXs -join ","))
}

Write-Host "--- Sheet 3 arm_far_lower Profile (y=639..865) ---"
for ($y = 640; $y -le 865; $y += 15) {
    $x0 = -1; $x1 = -1
    for ($x = 615; $x -le 895; $x++) {
        $p = $s3.GetPixel($x, $y)
        if (-not ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)) {
            if ($x0 -lt 0) { $x0 = $x }
            $x1 = $x
        }
    }
    Write-Host ("  y={0}: x=[{1}..{2}] w={3}" -f $y, $x0, $x1, ($x1 - $x0 + 1))
}
$s3.Dispose()

# 3. Sheet 4: Check leg pair separation in Cell(0,0) (x=129..430, y=73..478) and Cell(0,1) (x=608..909, y=79..478)
$s4 = [System.Drawing.Bitmap]::FromFile("$brain\sheet4_legs_weapons_1795506367940.jpg")
Write-Host "--- Sheet 4 Cell(0,0) Legs Crotch Split (y=75..280) ---"
for ($y = 75; $y -le 280; $y += 15) {
    $runs = @()
    $inRun = $false; $r0 = 0
    for ($x = 125; $x -le 435; $x++) {
        $p = $s4.GetPixel($x, $y)
        $fg = -not ($p.G -gt 150 -and $p.R -lt 120 -and $p.B -lt 120)
        if ($fg -and -not $inRun) { $inRun = $true; $r0 = $x }
        elseif (-not $fg -and $inRun) { $inRun = $false; $runs += ("{0}..{1}" -f $r0, ($x - 1)) }
    }
    if ($inRun) { $runs += ("{0}..435" -f $r0) }
    Write-Host ("  y={0}: runs={1}" -f $y, ($runs -join " | "))
}
$s4.Dispose()
