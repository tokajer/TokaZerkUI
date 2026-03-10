Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$defaultsDir = Join-Path $scriptDir "Options\.defaults"
$previewDir = Join-Path $scriptDir "Assets\previews"

# --- Category definitions ---
$categories = @(
    @{
        Name     = "HUD Style"
        Target   = "new_summary_window.xml"
        Variants = @(
            @{ Label = "Default";  Source = $null },
            @{ Label = "HUD Bars"; Source = "Options\HUD\new_summary_window.xml" }
        )
        Previews = @("hud_default.png", "hud_bars.png")
    },
    @{
        Name     = "Target Window"
        Target   = "custom2_window.xml"
        Variants = @(
            @{ Label = "Default";          Source = $null },
            @{ Label = "Blue (TokaZerk)";  Source = "Options\TargetWindow\blue(TokaZerk)\custom2_window.xml" },
            @{ Label = "Purple";           Source = "Options\TargetWindow\purple\custom2_window.xml" }
        )
        Previews = @("target_default.png", "target_blue.png", "target_purple.png")
    },
    @{
        Name     = "Float Target Window"
        Target   = "float_target_window.xml"
        Variants = @(
            @{ Label = "Default";   Source = $null },
            @{ Label = "HUD Style"; Source = "Options\floatTargetWindow\float_target_window.xml" }
        )
        Previews = @("float_default.png", "float_alternative.png")
    }
)

# --- Backup defaults on first run ---
function Ensure-Defaults {
    if (-not (Test-Path $defaultsDir)) {
        New-Item -ItemType Directory -Path $defaultsDir -Force | Out-Null
        foreach ($cat in $categories) {
            $rootFile = Join-Path $scriptDir $cat.Target
            if (Test-Path $rootFile) {
                Copy-Item $rootFile (Join-Path $defaultsDir $cat.Target) -Force
            }
        }
    }
}

# --- File hash helper ---
function Get-FileHashMD5($path) {
    if (-not (Test-Path $path)) { return $null }
    $md5 = [System.Security.Cryptography.MD5]::Create()
    $stream = [System.IO.File]::OpenRead($path)
    try {
        $hash = $md5.ComputeHash($stream)
        return [BitConverter]::ToString($hash) -replace '-', ''
    } finally {
        $stream.Close()
        $md5.Dispose()
    }
}

# --- Detect current selection per category ---
function Detect-Current($cat) {
    $rootFile = Join-Path $scriptDir $cat.Target
    $rootHash = Get-FileHashMD5 $rootFile
    if ($null -eq $rootHash) { return 0 }

    for ($i = 1; $i -lt $cat.Variants.Count; $i++) {
        $src = $cat.Variants[$i].Source
        if ($null -ne $src) {
            $srcPath = Join-Path $scriptDir $src
            $srcHash = Get-FileHashMD5 $srcPath
            if ($srcHash -eq $rootHash) { return $i }
        }
    }
    return 0
}

# --- Load preview image or create placeholder ---
function Get-PreviewImage($filename, $width, $height) {
    $path = Join-Path $previewDir $filename
    if (Test-Path $path) {
        try {
            $img = [System.Drawing.Image]::FromFile($path)
            $bmp = New-Object System.Drawing.Bitmap($width, $height)
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.DrawImage($img, 0, 0, $width, $height)
            $g.Dispose()
            $img.Dispose()
            return $bmp
        } catch {}
    }
    # Placeholder
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(45, 45, 48))
    $rect = New-Object System.Drawing.RectangleF(0, 0, $width, $height)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $font = New-Object System.Drawing.Font("Segoe UI", 9)
    $g.DrawString("No preview", $font, [System.Drawing.Brushes]::Gray, $rect, $sf)
    $border = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(80, 80, 80))
    $g.DrawRectangle($border, 0, 0, $width - 1, $height - 1)
    $font.Dispose()
    $sf.Dispose()
    $border.Dispose()
    $g.Dispose()
    return $bmp
}

# --- Build the GUI ---
Ensure-Defaults

$form = New-Object System.Windows.Forms.Form
$form.Text = "TokaZerk UI Option Picker"
$form.Size = New-Object System.Drawing.Size(720, 620)  # overridden by ClientSize below
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedSingle"
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 30)
$form.ForeColor = [System.Drawing.Color]::FromArgb(220, 220, 220)
$form.Font = New-Object System.Drawing.Font("Segoe UI", 9)

$previewW = 150
$previewH = 100
[int]$yOffset = 10
$radioGroups = @{}

foreach ($cat in $categories) {
    $variantCount = $cat.Variants.Count
    $groupWidth = 680
    $groupHeight = 150
    $group = New-Object System.Windows.Forms.GroupBox
    $group.Text = $cat.Name
    $group.Location = New-Object System.Drawing.Point(10, $yOffset)
    $group.Size = New-Object System.Drawing.Size($groupWidth, $groupHeight)
    $group.ForeColor = [System.Drawing.Color]::FromArgb(180, 200, 255)

    $radios = @()
    $currentIdx = Detect-Current $cat
    [int]$spacing = [Math]::Floor(($groupWidth - 20) / $variantCount)

    for ($i = 0; $i -lt $variantCount; $i++) {
        $v = $cat.Variants[$i]
        [int]$xPos = 10 + ($i * $spacing)

        $rb = New-Object System.Windows.Forms.RadioButton
        $rb.Text = $v.Label
        $rb.Location = New-Object System.Drawing.Point($xPos, 22)
        $rb.Size = New-Object System.Drawing.Size(([int]($spacing - 10)), 20)
        $rb.ForeColor = [System.Drawing.Color]::FromArgb(220, 220, 220)
        $rb.FlatStyle = "Flat"
        if ($i -eq $currentIdx) { $rb.Checked = $true }
        $group.Controls.Add($rb)
        $radios += $rb

        $pb = New-Object System.Windows.Forms.PictureBox
        $pb.Location = New-Object System.Drawing.Point($xPos, 45)
        $pb.Size = New-Object System.Drawing.Size($previewW, $previewH)
        $pb.SizeMode = "Zoom"
        $pb.Cursor = [System.Windows.Forms.Cursors]::Hand
        $pb.Image = Get-PreviewImage $cat.Previews[$i] $previewW $previewH
        $pb.Tag = $rb
        $pb.Add_Click({ $this.Tag.Checked = $true })
        $group.Controls.Add($pb)
    }

    $radioGroups[$cat.Name] = $radios
    $form.Controls.Add($group)
    $yOffset += $groupHeight + 10
}

# --- Apply button ---
[int]$btnY = $yOffset
[int]$statusY = $btnY + 48

$btnApply = New-Object System.Windows.Forms.Button
$btnApply.Text = "Apply Selected Options"
$btnApply.Location = New-Object System.Drawing.Point(10, $btnY)
$btnApply.Size = New-Object System.Drawing.Size(680, 40)
$btnApply.FlatStyle = "Flat"
$btnApply.BackColor = [System.Drawing.Color]::FromArgb(0, 100, 180)
$btnApply.ForeColor = [System.Drawing.Color]::White
$btnApply.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$btnApply.Cursor = [System.Windows.Forms.Cursors]::Hand
$form.Controls.Add($btnApply)

# --- Status label ---
$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Location = New-Object System.Drawing.Point(10, $statusY)
$lblStatus.Size = New-Object System.Drawing.Size(680, 22)
$lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(100, 200, 100)
$lblStatus.Text = ""
$form.Controls.Add($lblStatus)

# --- Set form size to fit content ---
$form.ClientSize = New-Object System.Drawing.Size(700, ($statusY + 30))

# --- Apply logic ---
$btnApply.Add_Click({
    $applied = @()
    foreach ($cat in $categories) {
        $radios = $radioGroups[$cat.Name]
        $selectedIdx = -1
        for ($i = 0; $i -lt $radios.Count; $i++) {
            if ($radios[$i].Checked) { $selectedIdx = $i; break }
        }
        if ($selectedIdx -lt 0) { continue }

        $targetPath = Join-Path $scriptDir $cat.Target

        if ($selectedIdx -eq 0) {
            # Restore default
            $defaultFile = Join-Path $defaultsDir $cat.Target
            if (Test-Path $defaultFile) {
                Copy-Item $defaultFile $targetPath -Force
                $applied += "$($cat.Name): Default"
            } else {
                $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(255, 100, 100)
                $lblStatus.Text = "Error: Default backup missing for $($cat.Target)"
                return
            }
        } else {
            $srcPath = Join-Path $scriptDir $cat.Variants[$selectedIdx].Source
            if (Test-Path $srcPath) {
                Copy-Item $srcPath $targetPath -Force
                $applied += "$($cat.Name): $($cat.Variants[$selectedIdx].Label)"
            } else {
                $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(255, 100, 100)
                $lblStatus.Text = "Error: Source file missing - " + $cat.Variants[$selectedIdx].Source
                return
            }
        }
    }

    $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(100, 200, 100)
    $lblStatus.Text = [char]0x2713 + " Applied: " + ($applied -join " | ")
})

[void]$form.ShowDialog()
