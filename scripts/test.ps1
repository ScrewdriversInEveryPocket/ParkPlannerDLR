<#
.SYNOPSIS
  Runs all the app tests in one go and prints the result: data checks, about 300 sample plans checked
  against the planner's rules, a wizard trip, both PDFs, and 101 plans compared with the expected ones.
.DESCRIPTION
  Starts scripts\serve.ps1 in the background, opens tests\run.html in Microsoft Edge (or Chrome) with no
  window and a fresh, throwaway profile, waits for the results, then closes everything. Nothing in the app
  changes, and your own browser and saved settings aren't touched. Takes about two minutes.
  Exit code 0 = everything passed, 1 = something failed (the failures are listed).
  When a change is meant to change plans, check the differences it lists, then run it with -Update to save
  the new plans as the expected ones (tests\golden\plans.json).
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\test.ps1
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\test.ps1 -Update
#>
param([switch]$Update, [switch]$Show, [int]$Port = 8123, [int]$TimeoutSec = 600, [string]$Browser = '')
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$results = Join-Path $root 'tests\results'; $latest = Join-Path $results 'latest.json'
New-Item -ItemType Directory -Force $results | Out-Null
Remove-Item -LiteralPath $latest -ErrorAction SilentlyContinue

# find a browser
if (-not $Browser) {
  $Browser = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
}
if (-not $Browser) { Write-Error 'Could not find Microsoft Edge or Chrome. Pass one with -Browser <path to the .exe>.'; exit 1 }

# the local server, in the background
$job = Start-Job -ScriptBlock { param($s, $p) & $s -Port $p -Quiet } -ArgumentList (Join-Path $PSScriptRoot 'serve.ps1'), $Port
$up = $false
for ($i = 0; $i -lt 40 -and -not $up; $i++) {
  Start-Sleep -Milliseconds 250
  try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1', $Port); $c.Close(); $up = $true } catch { }
}
if (-not $up) { Receive-Job $job; Stop-Job $job; Remove-Job $job; Write-Error "The test server didn't start on port $Port. Try -Port 8124."; exit 1 }

$profileDir = Join-Path ([IO.Path]::GetTempPath()) ("dlr-planner-test-" + [Guid]::NewGuid().ToString('N').Substring(0, 8))
$url = "http://localhost:$Port/tests/run.html?auto=1" + $(if ($Update) { '&update=1' } else { '' })
$bargs = @("--user-data-dir=$profileDir", '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--window-size=1400,1000')
if (-not $Show) { $bargs += @('--headless=new', '--disable-gpu') }
$bargs += $url
"Testing with $(Split-Path $Browser -Leaf) (about two minutes)..."
$proc = Start-Process -FilePath $Browser -ArgumentList $bargs -PassThru

$t0 = Get-Date
try {
  while (-not (Test-Path -LiteralPath $latest)) {
    if (((Get-Date) - $t0).TotalSeconds -gt $TimeoutSec) { Write-Warning "No result after $TimeoutSec seconds."; break }
    Start-Sleep -Seconds 1
  }
  Start-Sleep -Milliseconds 500
} finally {
  # close the test browser (all its processes use the throwaway profile) and the server
  Get-CimInstance Win32_Process -Filter "Name='msedge.exe' OR Name='chrome.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*$profileDir*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
  Stop-Job $job -ErrorAction SilentlyContinue; Remove-Job $job -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 500
  Remove-Item -LiteralPath $profileDir -Recurse -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path -LiteralPath $latest)) { 'FAILED: the tests did not finish. Run with -Show to watch them in a browser window.'; exit 1 }
$r = [IO.File]::ReadAllText($latest, [Text.Encoding]::UTF8) | ConvertFrom-Json
if ($r.crashed) { "FAILED: the test page crashed: $($r.crashed)"; exit 1 }
"App $($r.app), tested as if today were $($r.today), in $([int]((Get-Date) - $t0).TotalSeconds) seconds."
foreach ($s in $r.sections) {
  $mark = if ($s.fail) { 'FAIL' } else { ' ok ' }
  "[$mark] $($s.name): $($s.pass) passed$(if ($s.fail) { ", $($s.fail) failed" })"
  foreach ($x in @($s.items) | Select-Object -First 20) {
    "       - $($x.name)"
    if ($x.msg) { ($x.msg -split "`n") | Select-Object -First 8 | ForEach-Object { "           $_" } }
  }
  if (@($s.items).Count -gt 20) { "       ...and $(@($s.items).Count - 20) more (open tests\results\latest.json)" }
}
if ($Update) { 'Saved these plans as the expected ones (tests\golden\plans.json).' }
if ($r.fail) {
  "`n$($r.fail) check(s) failed."
  if ($r.golden -and @($r.golden.changed).Count -and -not $Update) { 'If the plan changes listed are what you meant, save them with:  .\scripts\test.ps1 -Update' }
  exit 1
}
"`nAll $($r.pass) checks passed."
exit 0
