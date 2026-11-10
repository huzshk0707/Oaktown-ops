# Run by Install.cmd in Windows PowerShell 5.1. Installs for the current user only.
[CmdletBinding()]
param(
    [string]$PackageDirectory,
    [string]$InstallDirectory,
    [string]$RegistryRoot = 'HKCU:\Software\Classes\oaktown-ops'
)
$ErrorActionPreference = 'Stop'
trap { Write-Host $_.Exception.Message; Write-Host $_.ScriptStackTrace; exit 1 }
if ([string]::IsNullOrWhiteSpace($PackageDirectory)) { $PackageDirectory = [IO.Path]::GetDirectoryName($MyInvocation.MyCommand.Path) }
if ([string]::IsNullOrWhiteSpace($InstallDirectory)) { $InstallDirectory = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'OaktownOpsLauncher' }
$owner = 'Oaktown.Ops.DesktopLauncher.v1'
if ($RegistryRoot -notmatch '\AHKCU:\\Software\\[A-Za-z0-9._\\-]+\z') { throw 'Only a current-user Software registry location is supported.' }
if ($InstallDirectory -notmatch '\A[A-Za-z]:\\' -or [IO.Path]::GetFullPath($InstallDirectory).TrimEnd('\') -eq [IO.Path]::GetPathRoot($InstallDirectory).TrimEnd('\')) { throw 'Choose a local, dedicated install folder.' }
$marker = Join-Path $InstallDirectory 'owner.txt'
if ((Test-Path -LiteralPath $InstallDirectory) -and (Get-ChildItem -LiteralPath $InstallDirectory -Force | Measure-Object).Count -gt 0) {
    if (!(Test-Path -LiteralPath $marker) -or [IO.File]::ReadAllText($marker) -cne $owner) { throw 'The install folder belongs to another application. Setup stopped.' }
}
if (Test-Path -LiteralPath $RegistryRoot) {
    if ((Get-Item -LiteralPath $RegistryRoot).GetValue('OaktownLauncherOwner') -cne $owner) { throw 'The app-link registration belongs to another application. Setup stopped.' }
}
$stage = Join-Path ([IO.Path]::GetTempPath()) ('OaktownLauncher-' + [guid]::NewGuid().ToString('N'))
try {
    New-Item -ItemType Directory -Path $stage | Out-Null
    $source = Join-Path $PackageDirectory 'Launcher.cs'
    $configFile = Join-Path $PackageDirectory 'apps.json'
    foreach ($file in @($source, $configFile, (Join-Path $PackageDirectory 'Uninstall.ps1'), (Join-Path $PackageDirectory 'Uninstall.cmd'))) {
        if (!(Test-Path -LiteralPath $file -PathType Leaf)) { throw 'Extract the entire setup ZIP before running Install.cmd.' }
    }
    $compiled = Join-Path $stage 'OaktownOpsLauncher.exe'
    Add-Type -TypeDefinition ([IO.File]::ReadAllText($source)) -OutputAssembly $compiled -OutputType WindowsApplication -ReferencedAssemblies @('System.dll','System.Core.dll','System.Xml.dll','System.Runtime.Serialization.dll','System.Windows.Forms.dll')
    [Reflection.Assembly]::Load([IO.File]::ReadAllBytes($compiled)) | Out-Null
    $config = [Oaktown.Ops.LauncherPolicy]::ReadConfiguration($configFile, $true)
    $clean = @{ version = 1; apps = @($config.Apps | ForEach-Object { @{ id = $_.Id; name = $_.Name; executable = $_.Executable } }) }
    [IO.File]::WriteAllText((Join-Path $stage 'apps.json'), ($clean | ConvertTo-Json -Depth 5), (New-Object Text.UTF8Encoding($false)))
    New-Item -ItemType Directory -Path $InstallDirectory -Force | Out-Null
    Copy-Item -LiteralPath $compiled -Destination (Join-Path $InstallDirectory 'OaktownOpsLauncher.exe') -Force
    Copy-Item -LiteralPath (Join-Path $stage 'apps.json') -Destination (Join-Path $InstallDirectory 'apps.json') -Force
    foreach ($file in @('Uninstall.ps1','Uninstall.cmd')) { Copy-Item -LiteralPath (Join-Path $PackageDirectory $file) -Destination (Join-Path $InstallDirectory $file) -Force }
    [IO.File]::WriteAllText($marker, $owner)
    New-Item -Path $RegistryRoot -Force | Out-Null
    Set-Item -LiteralPath $RegistryRoot -Value 'URL:Oaktown Ops desktop apps'
    New-ItemProperty -LiteralPath $RegistryRoot -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
    New-ItemProperty -LiteralPath $RegistryRoot -Name 'OaktownLauncherOwner' -Value $owner -PropertyType String -Force | Out-Null
    $commandKey = Join-Path $RegistryRoot 'shell\open\command'
    New-Item -Path $commandKey -Force | Out-Null
    Set-Item -LiteralPath $commandKey -Value ('"' + (Join-Path $InstallDirectory 'OaktownOpsLauncher.exe') + '" "%1"')
    Write-Host 'Installed for this Windows user. In Oaktown Ops, open PC apps and choose your app.'
    Write-Host 'Your browser may ask permission to open Oaktown Ops desktop apps.'
}
finally {
    if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
}
