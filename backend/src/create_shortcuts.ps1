$target = 'c:\Users\saif\Desktop\convert script\dist\ERytmo_Script_Converter.exe'
if (-not (Test-Path $target)) {
    $target = 'c:\Users\saif\Desktop\convert script\dist\ERytmo Script Converter.exe'
}
$icon = 'c:\Users\saif\Desktop\convert script\src\app_logo.ico'

$ws = New-Object -ComObject WScript.Shell

# 1. Shortcut on User Desktop
$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$shortcutDesktop = Join-Path $desktopPath 'ERytmo Script Converter.lnk'
$s1 = $ws.CreateShortcut($shortcutDesktop)
$s1.TargetPath = $target
$s1.WorkingDirectory = (Split-Path $target)
if (Test-Path $icon) { $s1.IconLocation = "$icon,0" }
$s1.Description = 'ERytmo Script Converter Desktop App'
$s1.Save()
Write-Host "Created Desktop Shortcut: $shortcutDesktop"

# 2. Shortcut in Convert Script project folder
$folderPath = 'c:\Users\saif\Desktop\convert script'
$shortcutFolder = Join-Path $folderPath 'Launch ERytmo Script Converter.lnk'
$s2 = $ws.CreateShortcut($shortcutFolder)
$s2.TargetPath = $target
$s2.WorkingDirectory = (Split-Path $target)
if (Test-Path $icon) { $s2.IconLocation = "$icon,0" }
$s2.Description = 'Launch ERytmo Script Converter'
$s2.Save()
Write-Host "Created Folder Shortcut: $shortcutFolder"
