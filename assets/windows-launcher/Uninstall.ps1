[CmdletBinding()]
param(
    [string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA 'OaktownOpsLauncher'),
    [string]$RegistryRoot = 'HKCU:\Software\Classes\oaktown-ops'
)
$ErrorActionPreference = 'Stop'
$owner = 'Oaktown.Ops.DesktopLauncher.v1'
if ($RegistryRoot -notmatch '\AHKCU:\\Software\\[A-Za-z0-9._\\-]+\z') { throw 'Only a current-user Software registry location is supported.' }
$marker = Join-Path $InstallDirectory 'owner.txt'
if (Test-Path -LiteralPath $RegistryRoot) {
    if ((Get-Item -LiteralPath $RegistryRoot).GetValue('OaktownLauncherOwner') -cne $owner) { throw 'The app-link registration belongs to another application. Nothing was removed.' }
}
if (Test-Path -LiteralPath $InstallDirectory) {
    if (!(Test-Path -LiteralPath $marker) -or [IO.File]::ReadAllText($marker) -cne $owner) { throw 'The install folder is not owned by this launcher. Nothing was removed.' }
}
if (Test-Path -LiteralPath $RegistryRoot) { Remove-Item -LiteralPath $RegistryRoot -Recurse -Force }
foreach ($file in @('OaktownOpsLauncher.exe','apps.json','Uninstall.ps1','Uninstall.cmd','owner.txt')) {
    $path = Join-Path $InstallDirectory $file
    if (Test-Path -LiteralPath $path -PathType Leaf) { Remove-Item -LiteralPath $path -Force }
}
if ((Test-Path -LiteralPath $InstallDirectory) -and (Get-ChildItem -LiteralPath $InstallDirectory -Force | Measure-Object).Count -eq 0) { Remove-Item -LiteralPath $InstallDirectory }
Write-Host 'Oaktown Ops desktop launcher removed for this user. Your applications were not removed.'
