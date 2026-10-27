<#
.SYNOPSIS
  Builds the CSVs of data\park_hours_2025.js (every day of one year) and data\hours_by_week.js (average hours open
  by week) from a full year of Disney's published hours.
.DESCRIPTION
  Where the hours come from, first found wins for each date and park:
    1. data\park_hours_published.js. scripts\update-data.ps1 keeps its past rows, so it builds up a year's history;
    2. _sources\shows\raw\calendar-<date>.json files saved by fetch-shows.ps1 (parsed the same way as parse-shows.ps1).
  Every date of -Year must be there for both parks, or nothing is written and the missing dates are listed: never
  fill gaps by hand or with guesses. Run it in January for the year just ended (e.g. -Year 2026 in January 2027).
  hours_by_week = mean of (close - open) over the days of each week (UPDATING.md's week numbers), 1 decimal, half to even.
  Writes _sources\park_hours\park_hours_2025.csv and hours_by_week.csv (the dataset id stays park_hours_2025: the
  code looks for it). scripts\update-data.ps1 -Only typical-hours imports them and updates title, about and source.
  -Check rebuilds hours_by_week from the current data\park_hours_2025.js and compares (proves the method).
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\_sources\park_hours\build-typical-hours.ps1 -Year 2026
#>
param([int]$Year = (Get-Date).Year - 1, [switch]$Check, [string]$Dir = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $Dir -Parent) -Parent
$utf8 = New-Object Text.UTF8Encoding $false
$inv = [Globalization.CultureInfo]::InvariantCulture
$nd = [string][char]0x2013   # en dash in week labels (kept out of this file: Windows PowerShell reads it as ANSI)
$mon = 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
function DataCsv($id) { [regex]::Match([IO.File]::ReadAllText((Join-Path $root "data\$id.js"), $utf8), '(?s)\}, `(.*?)\r?\n`\);').Groups[1].Value -replace "`r", '' }
function WeekOf([datetime]$t) { $md = if ($t.Month -eq 2 -and $t.Day -eq 29) { 28 } else { $t.Day }; [int][math]::Min(52, [math]::Floor(((New-Object datetime 2025, $t.Month, $md).DayOfYear - 1) / 7) + 1) }
function WeekLabel($w) { $a = (New-Object datetime 2025, 1, 1).AddDays(7 * ($w - 1)); $b = if ($w -eq 52) { New-Object datetime 2025, 12, 31 } else { $a.AddDays(6) }
  if ($a.Month -eq $b.Month) { "$($mon[$a.Month - 1]) $($a.Day)$nd$($b.Day)" } else { "$($mon[$a.Month - 1]) $($a.Day)$nd$($mon[$b.Month - 1]) $($b.Day)" } }
function Dec([string]$t) { $x = [datetime]::ParseExact($t.Trim(), 'h:mm tt', $inv); $x.Hour + $x.Minute / 60 }
function ByWeek($rows) {
  @('week,week_label,disneyland,california_adventure') + (1..52 | ForEach-Object { $w = $_
    $v = foreach ($p in 'Disneyland', 'California Adventure') {
      $g = @($rows | Where-Object { $_.park -eq $p -and [int]$_.week -eq $w } | ForEach-Object { [double]$_.close - [double]$_.open })
      [math]::Round(($g | Measure-Object -Average).Average, 1).ToString('F1', $inv)
    }
    "$w,$(WeekLabel $w),$($v -join ',')" })
}

if ($Check) {
  $new = ByWeek (DataCsv 'park_hours_2025' | ConvertFrom-Csv)
  $cur = (DataCsv 'hours_by_week') -split "`n"
  $bad = @(0..($new.Count - 1) | Where-Object { $new[$_] -ne $cur[$_] })
  "hours_by_week rebuilt from park_hours_2025: $(if ($bad) { "$($bad.Count) rows differ" } else { 'identical' })"
  $bad | Select-Object -First 5 | ForEach-Object { "  now: $($cur[$_])`n  new: $($new[$_])" }
  return
}

$have = @{}
foreach ($r in (DataCsv 'park_hours_published' | ConvertFrom-Csv)) { if ($r.date.StartsWith("$Year-")) { $have["$($r.date)|$($r.park)"] = $r } }
$parks = @{ '330339;entityType=theme-park' = 'Disneyland'; '336894;entityType=theme-park' = 'California Adventure' }
foreach ($f in Get-ChildItem (Join-Path $root '_sources\shows\raw') -Filter "calendar-$Year-*.json" -ErrorAction SilentlyContinue) {
  $date = $f.BaseName -replace 'calendar-', ''
  $j = [IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8) | ConvertFrom-Json
  foreach ($l in $j.locations) {
    $park = $parks[$l.id]; if (-not $park -or $have["$date|$park"]) { continue }
    $op = @($l.schedules | Where-Object group -eq 'operating' | ForEach-Object { $_.schedules.$date } |
      Where-Object { $_.type -eq 'Operating' -and $_.time -match '^(.+ [AP]M) to (.+ [AP]M)$' } | ForEach-Object { , @((Dec $Matches[1]), (Dec $Matches[2])) })
    if (-not $op) { continue }
    $o = ($op | ForEach-Object { $_[0] } | Measure-Object -Minimum).Minimum
    $c = ($op | ForEach-Object { if ($_[1] -le $_[0]) { $_[1] + 24 } else { $_[1] } } | Measure-Object -Maximum).Maximum
    $have["$date|$park"] = [pscustomobject]@{ date = $date; park = $park; open = ([double]$o).ToString('0.0#', $inv); close = ([double]$c).ToString('0.0#', $inv) }
  }
}
$rows = @(); $missing = @()
foreach ($p in 'Disneyland', 'California Adventure') {
  for ($t = New-Object datetime $Year, 1, 1; $t.Year -eq $Year; $t = $t.AddDays(1)) {
    $iso = $t.ToString('yyyy-MM-dd'); $r = $have["$iso|$p"]
    if (-not $r) { $missing += "$iso $p"; continue }
    $rows += [pscustomobject]@{ date = $iso; weekday = $t.ToString('ddd', $inv); week = WeekOf $t; park = $p; open = $r.open; close = $r.close }
  }
}
if ($missing) {
  "Not written: $($missing.Count) of $($rows.Count + $missing.Count) park days of $Year have no published hours saved. First and last missing: $($missing[0]) ... $($missing[-1])"
  'Typical hours need a full year. Keep running scripts\update-data.ps1 through the year (it keeps past days), then try again.'
  exit 1
}
[IO.File]::WriteAllLines((Join-Path $Dir 'park_hours_2025.csv'), [string[]](@('date,weekday,week,park,open,close') + ($rows | ForEach-Object { ($_.date, $_.weekday, $_.week, $_.park, $_.open, $_.close) -join ',' })), $utf8)
[IO.File]::WriteAllLines((Join-Path $Dir 'hours_by_week.csv'), [string[]](ByWeek $rows), $utf8)
"Wrote park_hours_2025.csv ($($rows.Count) rows, $Year) and hours_by_week.csv."
