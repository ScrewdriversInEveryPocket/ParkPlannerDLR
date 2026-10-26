<#
.SYNOPSIS
  Puts an edited or freshly downloaded CSV back into data\<id>.js and updates its dates.
.DESCRIPTION
  Replaces the CSV text inside data\<id>.js with the CSV file (default _sources\edit\<id>.csv),
  after checking it has exactly the same header line. Sets the header's "pulled" date (default
  today) and, if given, "until" and "review". Copies the old file to _BACKUP first and bumps the
  app version in version.js so installed copies pick up the change. Afterwards open check.html.
.EXAMPLE
  .\scripts\import-dataset.ps1 park_hours_published -Until 2027-01-31 -Review 2026-12-20
.EXAMPLE
  .\scripts\import-dataset.ps1 refurbs -Csv C:\Users\me\Downloads\refurbs.csv
#>
param(
  [Parameter(Mandatory = $true, Position = 0)][string]$Id,
  [string]$Csv,
  [string]$Pulled = (Get-Date -Format 'yyyy-MM-dd'),
  [string]$Until,
  [string]$Review
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object System.Text.UTF8Encoding($false)
$file = Join-Path (Join-Path $root 'data') "$Id.js"
if (-not (Test-Path $file)) { throw "There is no data\$Id.js. To add a new dataset, copy an existing file, rename it and add it to data\manifest.js." }
if (-not $Csv) { $Csv = Join-Path (Join-Path (Join-Path $root '_sources') 'edit') "$Id.csv" }
if (-not (Test-Path $Csv)) { throw "Can't find $Csv. Run .\scripts\export-dataset.ps1 $Id first, or pass -Csv." }
foreach ($d in @($Pulled, $Until, $Review)) {
  if ($d -and $d -notmatch '^\d{4}-\d{2}-\d{2}$') { throw "Dates must look like 2026-12-31 (got '$d')." }
}

$js = [IO.File]::ReadAllText($file, $utf8)
$m = [regex]::Match($js, '(?s)^(.*\}, `)(.*?)(\r?\n`\);\s*)$')
if (-not $m.Success) { throw "data\$Id.js doesn't end with the expected  }, ``csv...``);  block." }
$oldCsv = $m.Groups[2].Value

$new = [IO.File]::ReadAllText($Csv, $utf8).TrimStart([char]0xFEFF) -replace "`r`n", "`n" -replace "`r", "`n"
$new = $new.TrimEnd("`n")
if ($new -match '[`\\]' -or $new.Contains('${')) { throw 'The CSV contains a backtick, a backslash or ${, which would break the data file. Remove them first.' }
$oldHead = ($oldCsv -split "`n")[0]; $newHead = ($new -split "`n")[0]
if ($oldHead -ne $newHead) { throw "The header line doesn't match.`n  data\$Id.js: $oldHead`n  $Csv : $newHead`nKeep the same columns in the same order (or change the columns list in the file's header too)." }

# back up the current file, then write the new one
$bak = Join-Path (Join-Path $root '_BACKUP') ((Get-Date -Format 'yyyy-MM-dd') + "-before-$Id")
if (-not (Test-Path $bak)) { New-Item -ItemType Directory -Path $bak | Out-Null }
Copy-Item $file (Join-Path $bak "$Id.js") -Force

$head = $m.Groups[1].Value
$set = { param($h, $key, $val) [regex]::Replace($h, "(?m)^(\s*$key\s*:\s*)""[^""]*""", { param($x) $x.Groups[1].Value + '"' + $val + '"' }) }
$head = & $set $head 'pulled' $Pulled
if ($Until) { $head = & $set $head 'until' $Until }
if ($Review) { $head = & $set $head 'review' $Review }
[IO.File]::WriteAllText($file, $head + $new + "`n" + '`);' + "`n", $utf8)

# bump the offline cache so installed copies of the app download the new data: "yyyy/MM/dd - vN", N counting up within a day
$swPath = Join-Path $root 'version.js'
$sw = [IO.File]::ReadAllText($swPath, $utf8)
$vm = [regex]::Match($sw, "PDP_VERSION = '([^']*)'")
if ($vm.Success) {
  $today = (Get-Date).ToString('yyyy/MM/dd', [Globalization.CultureInfo]::InvariantCulture)
  $dm = [regex]::Match($vm.Groups[1].Value, '^(\d{4}/\d{2}/\d{2}) - v(\d+)$')
  $n = if ($dm.Success -and $dm.Groups[1].Value -eq $today) { [int]$dm.Groups[2].Value + 1 } else { 1 }
  $next = "$today - v$n"
  [IO.File]::WriteAllText($swPath, $sw.Replace($vm.Value, "PDP_VERSION = '$next'"), $utf8)
  Write-Host "version.js is now $next."
}
$oldRows = ($oldCsv -split "`n").Count - 1; $newRows = ($new -split "`n").Count - 1
Write-Host "Updated data\$Id.js: $oldRows rows before, $newRows now; pulled $Pulled$(if ($Until) { ", until $Until" })$(if ($Review) { ", review $Review" })."
Write-Host "Old file saved in $bak. Now open check.html to check it."
