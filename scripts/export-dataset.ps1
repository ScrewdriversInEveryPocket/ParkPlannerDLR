<#
.SYNOPSIS
  Copies one dataset's CSV out of data\<id>.js into a .csv file you can edit.
.DESCRIPTION
  Park Day Planner keeps each dataset as CSV text inside data\<id>.js. This writes that CSV to
  _sources\edit\<id>.csv (or -Out). Edit it in a text editor, or in Excel only if you open it with
  every column set to Text (Excel otherwise rewrites dates like 2026-11-05 and 01-01). Then put it
  back with import-dataset.ps1. Nothing else is changed.
.EXAMPLE
  .\scripts\export-dataset.ps1 park_hours_published
#>
param(
  [Parameter(Mandatory = $true, Position = 0)][string]$Id,
  [string]$Out
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object System.Text.UTF8Encoding($false)
$file = Join-Path (Join-Path $root 'data') "$Id.js"
if (-not (Test-Path $file)) { throw "There is no data\$Id.js. The dataset names are listed in data\manifest.js." }
$js = [IO.File]::ReadAllText($file, $utf8)
$m = [regex]::Match($js, '(?s)\}, `(.*?)\r?\n`\);\s*$')
if (-not $m.Success) { throw "data\$Id.js doesn't end with the expected  }, ``csv...``);  block." }
if (-not $Out) {
  $dir = Join-Path (Join-Path $root '_sources') 'edit'
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  $Out = Join-Path $dir "$Id.csv"
}
[IO.File]::WriteAllText($Out, $m.Groups[1].Value + "`n", $utf8)
$rows = ($m.Groups[1].Value -split "`n").Count - 1
Write-Host "Wrote $Out ($rows rows). Edit it, then run: .\scripts\import-dataset.ps1 $Id"
