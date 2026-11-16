# APK firmato del guscio Android di ACE (docs/runbook.md, "APK di ACE").
# Uso, dalla cartella app:  powershell -File scripts\apk.ps1
# La password del keystore la chiede apksigner a video: non sta in nessun file.
# Keystore e APK stanno fuori dal repository: C:\progetti\ace\chiavi\ e C:\progetti\ace\apk\.
$ErrorActionPreference = 'Stop'
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.10'
$env:ANDROID_HOME = 'C:\progetti\ace\android-sdk'
$chiave = 'C:\progetti\ace\chiavi\ace-release.jks'
$uscita = 'C:\progetti\ace\apk'
$app = Split-Path $PSScriptRoot -Parent

if (-not (Test-Path $chiave)) { throw "manca il keystore $chiave (docs/runbook.md)" }
Set-Location $app
npx cap sync android
if ($LASTEXITCODE) { throw 'cap sync fallito' }
Set-Location "$app\android"
.\gradlew.bat assembleRelease --console=plain
if ($LASTEXITCODE) { throw 'compilazione fallita' }

$versione = (Select-String -Path 'app\build.gradle' -Pattern 'versionName "([^"]+)"').Matches[0].Groups[1].Value
$apk = "$uscita\ace-$versione.apk"
$signer = (Get-ChildItem "$env:ANDROID_HOME\build-tools" | Sort-Object Name | Select-Object -Last 1).FullName + '\apksigner.bat'
& $signer sign --ks $chiave --ks-key-alias ace --out $apk 'app\build\outputs\apk\release\app-release-unsigned.apk'
if ($LASTEXITCODE) { throw 'firma fallita' }
& $signer verify --print-certs $apk
Write-Host "APK pronto: $apk"
