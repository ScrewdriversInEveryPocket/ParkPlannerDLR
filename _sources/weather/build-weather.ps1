<#
.SYNOPSIS
  Builds the CSVs of data\weather_by_week.js, weather_by_month.js, weather_by_hour.js and sun_by_week.js from the
  Open-Meteo download that scripts\fetch-weather.ps1 saves (the newest _sources\weather\open-meteo-anaheim-*.json).
.DESCRIPTION
  Definitions (they reproduce the 2016-2025 files exactly; -Check proves it again):
    week                  UPDATING.md's week of the year (day of a non-leap year, Feb 29 as Feb 28; week 52 = Dec 24-31)
    avg_high_f / avg_low_f / feels_like_high_f   mean daily max / min temperature / max apparent temperature
    rain_chance_pct       % of days with precipitation >= 0.04 in
    heavy_rain_chance_pct % of days with >= 0.25 in ("Soaking")
    rain_hours_on_wet_days  mean precipitation hours on the >= 0.04 in days
    avg_rain_in           total precipitation in the week (or month) / number of years
    hot_day_pct           % of days with a high >= 90 F;  chilly_night_pct: % with a low < 45 F
    windy_day_pct         % of days with gusts >= 30 mph ("Gusts 30 mph+")
    humidity_pct          mean hourly relative humidity, all 24 hours
    daylight_hours        mean daylight duration;  days_sampled: days in the group
    weather_by_hour       hours 7 to 23 by week: mean temperature and apparent temperature (whole degrees),
                          rain_chance_pct = % of those hours with any precipitation (> 0)
    sun_by_week           mean sunrise and sunset (decimal hours, 3 places) by week, from the last year downloaded
  Rounding is half away from zero. Writes _sources\weather\<id>.csv for each; scripts\update-data.ps1 -Only weather
  imports them. -Check only compares with the current data files and prints the values that differ.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\_sources\weather\build-weather.ps1 -Check
#>
param([string]$Dir = $PSScriptRoot, [switch]$Check, [double]$HourRainIn = 0.01)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $Dir -Parent) -Parent
$utf8 = New-Object Text.UTF8Encoding $false
$inv = [Globalization.CultureInfo]::InvariantCulture
$file = Get-ChildItem $Dir -Filter 'open-meteo-anaheim-*.json' | Sort-Object Name | Select-Object -Last 1
if (-not $file) { throw "No open-meteo-anaheim-*.json in $Dir. Run .\scripts\fetch-weather.ps1 first." }
$j = [IO.File]::ReadAllText($file.FullName) | ConvertFrom-Json
$d = $j.daily; $h = $j.hourly
if (-not $d.wind_gusts_10m_max) { throw "$($file.Name) has no wind_gusts_10m_max; download it again with the current fetch-weather.ps1." }
function Rnd([double]$v, [int]$p) { [math]::Round($v, $p, [MidpointRounding]::AwayFromZero) }
function Fmt([double]$v, [int]$p) { (Rnd $v $p).ToString('F' + $p, $inv) }
function Week([datetime]$t) { $md = if ($t.Month -eq 2 -and $t.Day -eq 29) { 28 } else { $t.Day }; [int][math]::Min(52, [math]::Floor(((New-Object datetime 2025, $t.Month, $md).DayOfYear - 1) / 7) + 1) }
function Mean($a) { ($a | Measure-Object -Average).Average }
function PctOf($a, $test) { 100 * @($a | Where-Object $test).Count / @($a).Count }
$nd = [string][char]0x2013   # en dash in week labels (kept out of this file: Windows PowerShell reads it as ANSI)
$mon = 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'

# one object per day, with its humidity from the hourly series
$days = for ($i = 0; $i -lt $d.time.Count; $i++) {
  $t = [datetime]::ParseExact($d.time[$i], 'yyyy-MM-dd', $inv)
  $hum = 0; for ($k = 24 * $i; $k -lt 24 * $i + 24; $k++) { $hum += $h.relative_humidity_2m[$k] }
  [pscustomobject]@{ t = $t; week = Week $t; month = $t.Month; hi = $d.temperature_2m_max[$i]; lo = $d.temperature_2m_min[$i]
    feel = $d.apparent_temperature_max[$i]; rain = $d.precipitation_sum[$i]; rainh = $d.precipitation_hours[$i]; gust = $d.wind_gusts_10m_max[$i]
    hum = $hum; day = $d.daylight_duration[$i] / 3600; rise = $d.sunrise[$i]; set = $d.sunset[$i] }
}
$years = @($days | ForEach-Object { $_.t.Year } | Sort-Object -Unique).Count
function StatRow($g) {
  $wet = @($g | Where-Object { $_.rain -ge 0.04 })
  (Fmt (Mean $g.hi) 1), (Fmt (Mean $g.lo) 1), (Fmt (Mean $g.feel) 1), (Fmt (PctOf $g { $_.rain -ge 0.04 }) 1), (Fmt (PctOf $g { $_.rain -ge 0.25 }) 1),
  (Fmt $(if ($wet) { Mean $wet.rainh } else { 0 }) 1), (Fmt (($g.rain | Measure-Object -Sum).Sum / $years) 2), (Fmt (PctOf $g { $_.hi -ge 90 }) 1),
  (Fmt (PctOf $g { $_.lo -lt 45 }) 1), (Fmt (PctOf $g { $_.gust -ge 30 }) 1), (Fmt (($g.hum | Measure-Object -Sum).Sum / (24 * @($g).Count)) 0), (Fmt (Mean $g.day) 1), @($g).Count
}
function WeekLabel($w) { $a = (New-Object datetime 2025, 1, 1).AddDays(7 * ($w - 1)); $b = if ($w -eq 52) { New-Object datetime 2025, 12, 31 } else { $a.AddDays(6) }
  if ($a.Month -eq $b.Month) { "$($mon[$a.Month - 1]) $($a.Day)$nd$($b.Day)" } else { "$($mon[$a.Month - 1]) $($a.Day)$nd$($mon[$b.Month - 1]) $($b.Day)" } }
$cols = 'avg_high_f,avg_low_f,feels_like_high_f,rain_chance_pct,heavy_rain_chance_pct,rain_hours_on_wet_days,avg_rain_in,hot_day_pct,chilly_night_pct,windy_day_pct,humidity_pct,daylight_hours,days_sampled'
$byWeek = $days | Group-Object week -AsHashTable; $byMonth = $days | Group-Object month -AsHashTable
$out = [ordered]@{}
$out.weather_by_week = @("week,week_label,$cols") + (1..52 | ForEach-Object { ((@($_, (WeekLabel $_)) + (StatRow $byWeek[$_])) -join ',') })
$out.weather_by_month = @("month,month_num,$cols") + (1..12 | ForEach-Object { ((@($mon[$_ - 1], $_) + (StatRow $byMonth[$_])) -join ',') })

# hourly: hours 7-23 of every day, by week
$hr = @{}
for ($k = 0; $k -lt $h.time.Count; $k++) {
  $hh = $k % 24; if ($hh -lt 7) { continue }
  $key = "$($days[[math]::Floor($k / 24)].week),$hh"
  if (-not $hr[$key]) { $hr[$key] = @(0.0, 0.0, 0, 0) }
  $a = $hr[$key]; $a[0] += $h.apparent_temperature[$k]; $a[1] += $h.temperature_2m[$k]; if ($h.precipitation[$k] -ge $HourRainIn) { $a[2]++ }; $a[3]++
}
$out.weather_by_hour = @('week,hour,feels_like_f,temp_f,rain_chance_pct') + (1..52 | ForEach-Object { $w = $_; 7..23 | ForEach-Object {
  $a = $hr["$w,$_"]; "$w,$_,$(Fmt ($a[0] / $a[3]) 0),$(Fmt ($a[1] / $a[3]) 0),$(Fmt (100 * $a[2] / $a[3]) 0)" } })

# sun: the last year downloaded
$last = ($days | ForEach-Object { $_.t.Year } | Measure-Object -Maximum).Maximum
function Dh([string]$s) { $x = [datetime]::ParseExact($s, "yyyy-MM-dd'T'HH:mm", $inv); $x.Hour + $x.Minute / 60 }
$out.sun_by_week = @('week,week_label,sunset_hour,sunrise_hour') + (1..52 | ForEach-Object {
  $g = @($byWeek[$_] | Where-Object { $_.t.Year -eq $last }); "$_,$(WeekLabel $_),$(Fmt (Mean ($g | ForEach-Object { Dh $_.set })) 3),$(Fmt (Mean ($g | ForEach-Object { Dh $_.rise })) 3)" })

foreach ($id in $out.Keys) {
  if ($Check) {
    $js = [IO.File]::ReadAllText((Join-Path $root "data\$id.js"), $utf8)
    $cur = [regex]::Match($js, '(?s)\}, `(.*?)\r?\n`\);').Groups[1].Value -replace "`r", '' -split "`n"
    $bad = @(); for ($i = 0; $i -lt [math]::Max($cur.Count, $out[$id].Count); $i++) { if ($cur[$i] -ne $out[$id][$i]) { $bad += "    now: $($cur[$i])`n    new: $($out[$id][$i])" } }
    "$id : $(if ($bad) { "$($bad.Count) rows differ" } else { 'identical' })"; $bad | Select-Object -First 5
  } else {
    [IO.File]::WriteAllLines((Join-Path $Dir "$id.csv"), [string[]]$out[$id], $utf8); "Wrote $id.csv ($($out[$id].Count - 1) rows) from $($file.Name)"
  }
}
