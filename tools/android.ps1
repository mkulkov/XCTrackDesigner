param(
    [ValidateSet('Start', 'Status', 'Install', 'Capture')]
    [string]$Action = 'Status',
    [ValidatePattern('^emulator-\d+$')]
    [string]$Serial = 'emulator-5554',
    [string]$SdkRoot = 'C:\opt\AndroidSDK',
    [string]$AvdName = 'Medium_Phone'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if ($env:ANDROID_SDK_ROOT) { $SdkRoot = $env:ANDROID_SDK_ROOT }
elseif ($env:ANDROID_HOME) { $SdkRoot = $env:ANDROID_HOME }
$adb = Join-Path $SdkRoot 'platform-tools\adb.exe'
$emulator = Join-Path $SdkRoot 'emulator\emulator.exe'
if (-not (Test-Path -LiteralPath $adb)) { throw "ADB missing: $adb" }

function Invoke-Adb {
    param([string[]]$Arguments)
    $result = & $adb -s $Serial @Arguments
    if ($LASTEXITCODE -ne 0) { throw "ADB failed: $Arguments" }
    return $result
}

if ($Action -eq 'Start') {
    $devices = & $adb devices
    if (-not ($devices | Where-Object { $_ -match ('^' + [regex]::Escape($Serial) + '\s') })) {
        if (-not (Test-Path -LiteralPath $emulator)) { throw "Emulator missing: $emulator" }
        $avds = & $emulator -list-avds
        if ($AvdName -notin $avds) { throw "AVD missing: $AvdName" }
        $qaPath = Join-Path $projectRoot '.local\android-qa'
        New-Item -ItemType Directory -Force -Path $qaPath | Out-Null
        $port = $Serial.Substring('emulator-'.Length)
        Start-Process -FilePath $emulator -ArgumentList '-avd', $AvdName, '-no-snapshot-load', '-port', $port -WindowStyle Hidden -RedirectStandardOutput (Join-Path $qaPath 'emulator-stdout.log') -RedirectStandardError (Join-Path $qaPath 'emulator-stderr.log')
    }
    $deadline = (Get-Date).AddSeconds(120)
    do {
        try { $boot = & $adb -s $Serial shell getprop sys.boot_completed 2>$null }
        catch { $boot = '' }
        if ($boot -eq '1') { break }
        Start-Sleep -Seconds 3
    } while ((Get-Date) -lt $deadline)
    if ($boot -ne '1') { throw 'Emulator boot timed out; inspect .local/android-qa logs' }
}

$name = Invoke-Adb -Arguments @('emu', 'avd', 'name')
if ($name[0] -ne $AvdName) { throw "Refusing different AVD: $($name[0])" }

if ($Action -eq 'Install') {
    $apk = Join-Path $projectRoot 'research\apk\xctrack-latest.apk'
    if (-not (Test-Path -LiteralPath $apk)) { throw 'Research APK missing; see docs/research/apk.md' }
    $expected = '27AB4D0FB2B74A0DD5C148AFA55E827882A9632276DEFB4D137989CA642C4B9F'
    if ((Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash -ne $expected) { throw 'APK hash mismatch; refusing install' }
    Invoke-Adb -Arguments @('install', '-r', $apk)
}
if ($Action -eq 'Capture') {
    Push-Location $projectRoot
    try {
        python tools/android_snapshot.py --adb $adb --serial $Serial --capture .local/android-qa/current.png
        if ($LASTEXITCODE -ne 0) { throw 'Capture failed' }
    } finally { Pop-Location }
}
Invoke-Adb -Arguments @('shell', 'getprop', 'sys.boot_completed')
Invoke-Adb -Arguments @('shell', 'wm', 'size')
Invoke-Adb -Arguments @('shell', 'wm', 'density')
Invoke-Adb -Arguments @('shell', 'pm', 'path', 'org.xcontest.XCTrack')
