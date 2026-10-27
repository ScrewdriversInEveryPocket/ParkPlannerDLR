<#
.SYNOPSIS
  Raises the app version in version.js by one and, with -Note, adds the matching line to CHANGELOG.md.
.DESCRIPTION
  The version is 1.YYYYMM.N: N counts the updates saved this month and starts again at 1 in a new month
  (1.202610.5 -> 1.202610.6; the first in November is 1.202611.1). sw.js reads it to refresh the offline cache.
  Every change to any file needs exactly one bump. update-data.ps1 calls this once at the end of a refresh;
  import-dataset.ps1 calls it unless given -NoBump. Prints the new version.
.EXAMPLE
  .\scripts\bump-version.ps1 -Note "Fixed the walking time to Pixar Pal-A-Round."
#>
param([string]$Note)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object System.Text.UTF8Encoding($false)
$path = Join-Path $root 'version.js'
$js = [IO.File]::ReadAllText($path, $utf8)
$vm = [regex]::Match($js, "PDP_VERSION = '([^']*)'")
if (-not $vm.Success) { throw "version.js has no PDP_VERSION = '...' line." }
$month = (Get-Date).ToString('yyyyMM', [Globalization.CultureInfo]::InvariantCulture)
$dm = [regex]::Match($vm.Groups[1].Value, '^1\.(\d{6})\.(\d+)$')
$n = if ($dm.Success -and $dm.Groups[1].Value -eq $month) { [int]$dm.Groups[2].Value + 1 } else { 1 }
$next = "1.$month.$n"
[IO.File]::WriteAllText($path, $js.Replace($vm.Value, "PDP_VERSION = '$next'"), $utf8)
if ($Note) {
  $cl = Join-Path $root 'CHANGELOG.md'
  $text = [IO.File]::ReadAllText($cl, $utf8)
  $at = $text.IndexOf("|---|---|---|")
  if ($at -lt 0) { throw "CHANGELOG.md has no |---|---|---| table line; add the line by hand." }
  $at = $text.IndexOf("`n", $at) + 1
  $line = "| $next | $((Get-Date).ToString('yyyy-MM-dd')) | $Note |`n"
  [IO.File]::WriteAllText($cl, $text.Insert($at, $line), $utf8)
}
$next
