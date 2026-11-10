# Executes on the disposable Windows CI runner, never a user's configured PC.
$ErrorActionPreference = 'Stop'
$root = Join-Path ([IO.Path]::GetTempPath()) ('OaktownLauncherTests-' + [guid]::NewGuid().ToString('N'))
$registry = 'HKCU:\Software\Classes\oaktown-ops'
$foreignRegistry = 'HKCU:\Software\OaktownOpsLauncherTests\' + [guid]::NewGuid().ToString('N')
$package = Join-Path $root 'Setup package with spaces'
$installed = Join-Path $root 'Installed launcher'
$targetDirectory = Join-Path $root 'PDF editor & tools'
$target = Join-Path $targetDirectory 'FictionalPDF.exe'
$configFile = Join-Path $installed 'apps.json'
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$assertions = 0
if ($env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_OS -cne 'Windows') { throw 'Requires the disposable Windows GitHub Actions runner.' }
if (Test-Path -LiteralPath $registry) { throw 'The protocol already exists; requires a clean disposable runner.' }
function Assert($condition, $message) { if (!$condition) { throw $message }; $script:assertions++ }
function Reject([scriptblock]$action, $message) { $rejected = $false; try { & $action | Out-Null } catch { $rejected = $true }; Assert $rejected $message }
function Write-Json($path, $value) { [IO.File]::WriteAllText($path, ($value | ConvertTo-Json -Depth 6), (New-Object Text.UTF8Encoding($false))) }
function Run-Setup($script, $key) {
    $prior = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = & $powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $package $script) -InstallDirectory $installed -RegistryRoot $key 2>&1 | Out-String
        return @{ Code = $LASTEXITCODE; Output = $output }
    } finally { $ErrorActionPreference = $prior }
}
try {
    New-Item -ItemType Directory -Path $package, $targetDirectory -Force | Out-Null
    Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '..\assets\windows-launcher') -File | Copy-Item -Destination $package
    $stub = @'
using System;
using System.IO;
public static class FictionalDesktopTarget {
    public static void Main(string[] args) {
        File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"opened.txt"), Environment.CurrentDirectory + "\n" + args.Length);
    }
}
'@
    Add-Type -TypeDefinition $stub -OutputAssembly $target -OutputType ConsoleApplication
    $app = @{ id = 'pdfcraft'; name = 'Fictional PDF tool'; executable = $target }
    $valid = @{ version = 1; apps = @($app) }
    Write-Json (Join-Path $package 'apps.json') $valid
    $setup = Run-Setup 'Install.ps1' $registry
    Assert ($setup.Code -eq 0) ('Install failed: ' + $setup.Output)
    $launcher = Join-Path $installed 'OaktownOpsLauncher.exe'
    Assert (Test-Path -LiteralPath $launcher -PathType Leaf) 'Launcher was not compiled.'
    $registered = (Get-Item -LiteralPath (Join-Path $registry 'shell\open\command')).GetValue('')
    Assert ($registered -ceq ('"' + $launcher + '" "%1"')) 'Native handler command is not quoted correctly.'
    Assert ((Get-Item -LiteralPath $registry).GetValue('URL Protocol') -ceq '') 'URL Protocol registration missing.'
    Assert ((Get-Item -LiteralPath $registry).GetValue('OaktownLauncherOwner') -ceq 'Oaktown.Ops.DesktopLauncher.v1') 'Owner marker missing.'
    [Reflection.Assembly]::Load([IO.File]::ReadAllBytes($launcher)) | Out-Null
    $start = New-Object Diagnostics.ProcessStartInfo
    $start.FileName = $launcher; $start.Arguments = '"oaktown-ops://launch/pdfcraft"'; $start.UseShellExecute = $false
    $process = [Diagnostics.Process]::Start($start)
    try { if (!$process.WaitForExit(10000)) { $process.Kill(); throw 'Native launcher did not exit.' }; Assert ($process.ExitCode -eq 0) 'Native launcher failed.' } finally { $process.Dispose() }
    $opened = Join-Path $targetDirectory 'opened.txt'
    for ($i=0; $i -lt 100 -and !(Test-Path -LiteralPath $opened); $i++) { Start-Sleep -Milliseconds 100 }
    Assert (Test-Path -LiteralPath $opened) 'Approved application did not open.'
    $result = [IO.File]::ReadAllLines($opened)
    Assert ($result[0] -ieq $targetDirectory) 'Application working directory was wrong.'
    Assert ($result[1] -ceq '0') 'Unexpected arguments reached the application.'
    Remove-Item -LiteralPath $opened
    $protocolStart = New-Object Diagnostics.ProcessStartInfo
    $protocolStart.FileName = 'oaktown-ops://launch/pdfcraft'; $protocolStart.UseShellExecute = $true
    $protocolProcess = [Diagnostics.Process]::Start($protocolStart)
    if ($null -ne $protocolProcess) { try { if (!$protocolProcess.WaitForExit(10000)) { $protocolProcess.Kill(); throw 'Registered URI handler did not exit.' } } finally { $protocolProcess.Dispose() } }
    for ($i=0; $i -lt 100 -and !(Test-Path -LiteralPath $opened); $i++) { Start-Sleep -Milliseconds 100 }
    Assert (Test-Path -LiteralPath $opened) 'Registered Windows protocol did not launch the approved app.'
    Assert ([IO.File]::ReadAllLines($opened)[1] -ceq '0') 'Protocol dispatch supplied unexpected arguments.'
    Remove-Item -LiteralPath $opened
    foreach ($uri in @('http://example.invalid','oaktown-ops://launch/missing','oaktown-ops://launch/pdfcraft?file=C:\secret.pdf','oaktown-ops://launch/pdfcraft#x','oaktown-ops://launch/../pdfcraft','oaktown-ops://launch/%70dfcraft','oaktown-ops://launch/pdfcraft/','oaktown-ops://launch/pdfcraft" & calc.exe','OAKTOWN-OPS://launch/pdfcraft',"oaktown-ops://launch/pdfcraft`n")) {
        Reject { [Oaktown.Ops.LauncherPolicy]::Start([string[]]@($uri), $configFile) } ('Unsafe URI accepted: ' + $uri)
    }
    Reject { [Oaktown.Ops.LauncherPolicy]::Start([string[]]@('oaktown-ops://launch/pdfcraft','-EncodedCommand','anything'), $configFile) } 'Extra arguments accepted.'
    Assert (!(Test-Path -LiteralPath $opened)) 'Rejected request still opened the app.'
    $badConfig = Join-Path $root 'bad.json'
    foreach ($badPath in @('\\server\share\tool.exe','C:\tools\app.cmd','https://example.invalid/tool.exe','C:\tools\app.exe:stream.exe')) {
        Write-Json $badConfig @{ version=1; apps=@(@{id='pdfcraft';name='Example';executable=$badPath}) }
        Reject { [Oaktown.Ops.LauncherPolicy]::ReadConfiguration($badConfig, $false) } 'Nonlocal or non-executable path accepted.'
    }
    Write-Json $badConfig @{version=2;apps=@($app)}
    Reject { [Oaktown.Ops.LauncherPolicy]::ReadConfiguration($badConfig, $false) } 'Unknown config version accepted.'
    Write-Json $badConfig @{version=1;apps=@($app,$app)}
    Reject { [Oaktown.Ops.LauncherPolicy]::ReadConfiguration($badConfig, $false) } 'Duplicate app IDs accepted.'
    $before = (Get-FileHash -LiteralPath $configFile).Hash
    Write-Json (Join-Path $package 'apps.json') @{version=1;apps=@(@{id='pdfcraft';name='Example';executable=(Join-Path $root 'missing.exe')})}
    $badInstall = Run-Setup 'Install.ps1' $registry
    Assert ($badInstall.Code -ne 0) 'Missing application was allowed during setup.'
    Assert ((Get-FileHash -LiteralPath $configFile).Hash -ceq $before) 'Invalid update changed the existing app list.'
    Assert ((Get-Item -LiteralPath (Join-Path $registry 'shell\open\command')).GetValue('') -ceq $registered) 'Invalid update changed registration.'
    Write-Json (Join-Path $package 'apps.json') $valid
    New-Item -Path $foreignRegistry -Force | Out-Null
    New-ItemProperty -LiteralPath $foreignRegistry -Name 'OaktownLauncherOwner' -Value 'FictionalOtherApplication' -Force | Out-Null
    $foreignInstall = Run-Setup 'Install.ps1' $foreignRegistry
    Assert ($foreignInstall.Code -ne 0) 'Foreign handler was overwritten.'
    $foreignUninstall = Run-Setup 'Uninstall.ps1' $foreignRegistry
    Assert ($foreignUninstall.Code -ne 0) 'Foreign registration was removed.'
    Assert ((Get-Item -LiteralPath $foreignRegistry).GetValue('OaktownLauncherOwner') -ceq 'FictionalOtherApplication') 'Foreign ownership changed.'
    [IO.File]::WriteAllText((Join-Path $installed 'keep-me.txt'), 'User-owned file')
    $remove = Run-Setup 'Uninstall.ps1' $registry
    Assert ($remove.Code -eq 0) ('Uninstall failed: ' + $remove.Output)
    Assert (!(Test-Path -LiteralPath $registry)) 'Handler registration remains.'
    Assert (!(Test-Path -LiteralPath $launcher)) 'Launcher executable remains.'
    Assert (Test-Path -LiteralPath (Join-Path $installed 'keep-me.txt')) 'Uninstall removed an unrelated file.'
    Assert (Test-Path -LiteralPath $target) 'Uninstall removed the application.'
    Write-Host "Windows launcher: $assertions assertions passed (compile, native launch, URI policy, setup ownership and uninstall)."
} finally {
    foreach ($key in @($registry,$foreignRegistry)) { if (Test-Path -LiteralPath $key) { Remove-Item -LiteralPath $key -Recurse -Force } }
    if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
}
