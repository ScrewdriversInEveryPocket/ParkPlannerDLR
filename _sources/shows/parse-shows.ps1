# Reads every raw\calendar-<date>.json that fetch-shows.ps1 saved and writes:
#   disney_showtimes.csv          set showtimes (fireworks, parades, stage shows): the CSV of data\disney_showtimes.js
#   disney_atmosphere_times.csv   everything else (character meets, roaming acts), for reference only
#   ..\park_hours\park_hours_published.csv   general-admission hours: the CSV of data\park_hours_published.js
#     (early entry left out; a ticketed party night gets the note "<party> (closes to day guests at 6 pm)")
# Then prints a summary, including facilities Disney lists as closed for refurbishment (compare with data\refurbs.js).
# scripts\update-data.ps1 runs it and imports both CSVs when they changed.
param([string]$Dir = $PSScriptRoot)
$parks = @{ '330339;entityType=theme-park' = 'Disneyland'; '336894;entityType=theme-park' = 'California Adventure' }
$keep = 'parades', 'nighttimeSpectacularFirework', 'shows', 'event', 'specialTicketedEvent'
$inv = [Globalization.CultureInfo]::InvariantCulture
function To24([string]$t) {
  $dt = [datetime]::ParseExact($t.Trim(), 'h:mm tt', $inv)
  $dt.ToString('HH:mm')
}
function Dec([string]$t) { $dt = [datetime]::ParseExact($t.Trim(), 'h:mm tt', $inv); $dt.Hour + $dt.Minute / 60 }
# week of the year as UPDATING.md defines it: day of a non-leap year, Feb 29 counted as Feb 28
function Week([datetime]$d) { $md = if ($d.Month -eq 2 -and $d.Day -eq 29) { 28 } else { $d.Day }; [math]::Min(52, [math]::Floor(((New-Object datetime 2025, $d.Month, $md).DayOfYear - 1) / 7) + 1) }
function Q([string]$s) { if ($s -match '[",]') { '"' + $s.Replace('"', '""') + '"' } else { $s } }
$rows = @(); $atmo = @(); $other = @(); $hours = @(); $closed = @{}
foreach ($f in Get-ChildItem (Join-Path $Dir 'raw') -Filter 'calendar-*.json' | Sort-Object Name) {
  $date = $f.BaseName -replace 'calendar-', ''
  $j = [IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8) | ConvertFrom-Json
  foreach ($l in $j.locations) {
    $park = $parks[$l.id]
    if ($park) {
      # park hours: the Operating times (not early entry); after midnight runs past 24
      $op = @($l.schedules | Where-Object group -eq 'operating' | ForEach-Object { $_.schedules.$date } |
        Where-Object { $_.type -eq 'Operating' -and $_.time -match '^(.+ [AP]M) to (.+ [AP]M)$' } | ForEach-Object { , @((Dec $Matches[1]), (Dec $Matches[2])) })
      if ($op) {
        $open = ($op | ForEach-Object { $_[0] } | Measure-Object -Minimum).Minimum
        $close = ($op | ForEach-Object { if ($_[1] -le $_[0]) { $_[1] + 24 } else { $_[1] } } | Measure-Object -Maximum).Maximum
        $note = ''
        if ($l.schedules | Where-Object group -eq 'specialTicketedEvent') {
          $party = @($l.events | Where-Object type -eq 'event' | ForEach-Object { $_.data } |
            Where-Object { $_.schedules.$date.type -contains 'Special Ticketed Event' } | ForEach-Object { ($_.name -replace ' ', ' ').Trim() })[0]
          if (-not $party) { $party = 'Special ticketed event' }
          $h = [int][math]::Floor($close % 24); $m = [int][math]::Round(($close - [math]::Floor($close)) * 60)
          $at = '{0}{1} {2}' -f (($h + 11) % 12 + 1), $(if ($m) { ':{0:00}' -f $m } else { '' }), $(if ($h -lt 12) { 'am' } else { 'pm' })
          $note = "$party (closes to day guests at $at)"
        }
        $d = [datetime]::ParseExact($date, 'yyyy-MM-dd', $inv)
        $hours += [pscustomobject]@{ date = $date; weekday = $d.ToString('ddd', $inv); week = Week $d; park = $park
          open = ([double]$open).ToString('0.0#', $inv); close = ([double]$close).ToString('0.0#', $inv); note = $note }
      }
      foreach ($c in @($l.closedFacilities)) {
        if ($c.refurbishment) { $r = @($c.refurbishment | Sort-Object); $closed["$park | $($c.name)"] = "$($r[0]) to $($r[-1])" }
      }
    }
    foreach ($g in $l.events) {
      foreach ($e in $g.data) {
        $times = @(); $notes = @()
        foreach ($p in $e.schedules.PSObject.Properties) {
          if ($p.Name -ne $date) { continue }
          foreach ($s in $p.Value) {
            if ($s.time -match '^(\d{1,2}:\d{2} [AP]M)( to (\d{1,2}:\d{2} [AP]M))?$') {
              $t = To24 $Matches[1]; if ($Matches[3]) { $t += '-' + (To24 $Matches[3]) }; $times += $t
            } else { $notes += $s.time }
            if ($s.type -ne 'Performance Time') { $notes += $s.type }
          }
        }
        $name = ($e.name -replace ' ', ' ').Trim()
        $o = [pscustomobject]@{ date = $date; park = $park; group = $g.type; venue = $l.title; name = $name; times = ($times -join ';'); notes = (($notes | Select-Object -Unique) -join ';') }
        if (-not $park) { $other += $o }
        elseif ($o.notes -match 'Special Ticketed') { $other += $o }
        elseif ($keep -contains $g.type) { $rows += $o }
        else { $atmo += $o }
      }
    }
  }
}
$utf8 = New-Object Text.UTF8Encoding $false
$hdr = 'date,park,name,times,location'
$out = @($hdr) + ($rows | Sort-Object date, park, name | ForEach-Object { ($_.date, $_.park, (Q $_.name), $_.times, '') -join ',' })
[IO.File]::WriteAllLines((Join-Path $Dir 'disney_showtimes.csv'), $out, $utf8)
$out2 = @('date,park,category,name,times,location') + ($atmo | Sort-Object date, park, name | ForEach-Object { ($_.date, $_.park, $_.group, (Q $_.name), $_.times, '') -join ',' })
[IO.File]::WriteAllLines((Join-Path $Dir 'disney_atmosphere_times.csv'), $out2, $utf8)
$hd = Join-Path (Split-Path $Dir -Parent) 'park_hours'; New-Item -ItemType Directory -Force $hd | Out-Null
$out3 = @('date,weekday,week,park,open,close,note') + ($hours | Sort-Object @{ e = { $_.park -ne 'Disneyland' } }, date |
  ForEach-Object { ($_.date, $_.weekday, $_.week, $_.park, $_.open, $_.close, (Q $_.note)) -join ',' })
[IO.File]::WriteAllLines((Join-Path $hd 'park_hours_published.csv'), $out3, $utf8)
"rows=$($rows.Count) atmo=$($atmo.Count) other=$($other.Count) hours=$($hours.Count)"
'--- shows by park/category'
$rows | Group-Object park, group, name | ForEach-Object { $a = $_.Group; "{0} | {1} | {2} | {3} days {4}..{5}" -f $a[0].park, $a[0].group, $a[0].name, $a.Count, ($a.date | Sort-Object)[0], ($a.date | Sort-Object)[-1] }
'--- notes / odd'
$rows | Where-Object { $_.notes -or $_.times -match '-' -or -not $_.times } | ForEach-Object { "$($_.date) $($_.name) [$($_.times)] $($_.notes)" } | Select-Object -First 30
'--- atmosphere names'
$atmo | Group-Object park, name | ForEach-Object { "{0} | {1} | {2} days" -f $_.Group[0].park, $_.Group[0].name, $_.Count }
'--- closed for refurbishment (Disney calendar; compare with data\refurbs.js)'
$closed.Keys | Sort-Object | ForEach-Object { "$_ | $($closed[$_])" }
