<#
.SYNOPSIS
  Builds the CSVs of data\crowd_by_week.js, crowd_by_weekday.js and crowd_by_month.js from the daily Queue-Times
  crowd file in this folder (queue-times_crowd_by_date_*.csv: date,park,crowd_pct).
.DESCRIPTION
  The daily file itself is collected by hand, one Queue-Times calendar page at a time at a human pace (never get
  around its Cloudflare check). Everything after that is this script; don't average by hand.
  Method (as in About the data -> Sources and methods), per park:
    1. drop 2020-2022 (COVID);
    2. take each year's average out of that year's days, then add back the average of the 2023-onward days;
    3. 2023-onward days count twice; average by week (UPDATING.md's week numbers), weekday and month, 1 decimal.
  Writes <id>.csv here; scripts\update-data.ps1 -Only crowds imports them. -Check compares with the current files.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\_sources\crowds\build-crowds.ps1 -Check
#>
param([string]$Dir = $PSScriptRoot, [switch]$Check)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $Dir -Parent) -Parent
$utf8 = New-Object Text.UTF8Encoding $false
$inv = [Globalization.CultureInfo]::InvariantCulture
$nd = [string][char]0x2013   # en dash in week labels (kept out of this file: Windows PowerShell reads it as ANSI)
$mon = 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
function WeekOf([datetime]$t) { $md = if ($t.Month -eq 2 -and $t.Day -eq 29) { 28 } else { $t.Day }; [int][math]::Min(52, [math]::Floor(((New-Object datetime 2025, $t.Month, $md).DayOfYear - 1) / 7) + 1) }
function WeekLabel($w) { $a = (New-Object datetime 2025, 1, 1).AddDays(7 * ($w - 1)); $b = if ($w -eq 52) { New-Object datetime 2025, 12, 31 } else { $a.AddDays(6) }
  if ($a.Month -eq $b.Month) { "$($mon[$a.Month - 1]) $($a.Day)$nd$($b.Day)" } else { "$($mon[$a.Month - 1]) $($a.Day)$nd$($mon[$b.Month - 1]) $($b.Day)" } }
# numbers as the current files write them: 1 decimal, no trailing .0
function Num([double]$v) { [math]::Round($v, 1).ToString('0.#', $inv) }

$file = Get-ChildItem $Dir -Filter 'queue-times_crowd_by_date_*.csv' | Sort-Object Name | Select-Object -Last 1
$days = foreach ($r in (Import-Csv $file.FullName)) {
  $t = [datetime]::ParseExact($r.date, 'yyyy-MM-dd', $inv)
  if ($t.Year -ge 2020 -and $t.Year -le 2022) { continue }
  [pscustomobject]@{ t = $t; y = $t.Year; park = $r.park; v = [double]$r.crowd_pct; wt = $(if ($t.Year -ge 2023) { 2 } else { 1 }) }
}
$adj = @{}
foreach ($p in 'Disneyland', 'California Adventure') {
  $pd = @($days | Where-Object park -eq $p)
  $ym = @{}; foreach ($g in $pd | Group-Object y) { $ym[[int]$g.Name] = ($g.Group.v | Measure-Object -Average).Average }
  $recent = @($pd | Where-Object { $_.y -ge 2023 })
  $base = ($recent.v | Measure-Object -Average).Average
  $adj[$p] = foreach ($x in $pd) { [pscustomobject]@{ t = $x.t; a = $x.v - $ym[$x.y] + $base; wt = $x.wt } }
}
function WAvg($rows) { $s = 0.0; $n = 0; foreach ($r in $rows) { $s += $r.a * $r.wt; $n += $r.wt }; if ($n) { Num ($s / $n) } else { '' } }
$dow = 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
$out = [ordered]@{}
$out.crowd_by_week = @('week,week_label,disneyland,california_adventure') + (1..52 | ForEach-Object { $w = $_
  "$w,$(WeekLabel $w),$(WAvg ($adj['Disneyland'] | Where-Object { (WeekOf $_.t) -eq $w })),$(WAvg ($adj['California Adventure'] | Where-Object { (WeekOf $_.t) -eq $w }))" })
$out.crowd_by_weekday = @('day,day_order,disneyland,california_adventure') + (0..6 | ForEach-Object { $k = $dow[$_]
  "$k,$($_ + 1),$(WAvg ($adj['Disneyland'] | Where-Object { $_.t.ToString('ddd', $inv) -eq $k })),$(WAvg ($adj['California Adventure'] | Where-Object { $_.t.ToString('ddd', $inv) -eq $k }))" })
$out.crowd_by_month = @('month,month_num,disneyland,california_adventure') + (1..12 | ForEach-Object { $m = $_
  "$($mon[$m - 1]),$m,$(WAvg ($adj['Disneyland'] | Where-Object { $_.t.Month -eq $m })),$(WAvg ($adj['California Adventure'] | Where-Object { $_.t.Month -eq $m }))" })
foreach ($id in $out.Keys) {
  if ($Check) {
    $cur = [regex]::Match([IO.File]::ReadAllText((Join-Path $root "data\$id.js"), $utf8), '(?s)\}, `(.*?)\r?\n`\);').Groups[1].Value -replace "`r", '' -split "`n"
    $bad = @(0..($out[$id].Count - 1) | Where-Object { $out[$id][$_] -ne $cur[$_] })
    "$id : $(if ($bad) { "$($bad.Count) rows differ" } else { 'identical' })"
    $bad | Select-Object -First 3 | ForEach-Object { "    now: $($cur[$_])`n    new: $($out[$id][$_])" }
  } else { [IO.File]::WriteAllLines((Join-Path $Dir "$id.csv"), [string[]]$out[$id], $utf8); "Wrote $id.csv from $($file.Name)" }
}
