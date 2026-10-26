param([string]$Dir = $PSScriptRoot)
$parks = @{ '330339;entityType=theme-park' = 'Disneyland'; '336894;entityType=theme-park' = 'California Adventure' }
$keep = 'parades', 'nighttimeSpectacularFirework', 'shows', 'event', 'specialTicketedEvent'
function To24([string]$t) {
  $dt = [datetime]::ParseExact($t.Trim(), 'h:mm tt', [Globalization.CultureInfo]::InvariantCulture)
  $dt.ToString('HH:mm')
}
function Q([string]$s) { if ($s -match '[",]') { '"' + $s.Replace('"', '""') + '"' } else { $s } }
$rows = @(); $atmo = @(); $other = @()
foreach ($f in Get-ChildItem (Join-Path $Dir 'raw') -Filter 'calendar-*.json' | Sort-Object Name) {
  $date = $f.BaseName -replace 'calendar-', ''
  $j = [IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8) | ConvertFrom-Json
  foreach ($l in $j.locations) {
    $park = $parks[$l.id]
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
        $name = ($e.name -replace '\u00A0', ' ').Trim()
        $o = [pscustomobject]@{ date = $date; park = $park; group = $g.type; venue = $l.title; name = $name; times = ($times -join ';'); notes = (($notes | Select-Object -Unique) -join ';') }
        if (-not $park) { $other += $o }
        elseif ($o.notes -match 'Special Ticketed') { $other += $o }
        elseif ($keep -contains $g.type) { $rows += $o }
        else { $atmo += $o }
      }
    }
  }
}
$hdr = 'date,park,name,times,location'
$out = @($hdr) + ($rows | Sort-Object date, park, name | ForEach-Object { ($_.date, $_.park, (Q $_.name), $_.times, '') -join ',' })
[IO.File]::WriteAllLines((Join-Path $Dir 'disney_showtimes.csv'), $out, (New-Object Text.UTF8Encoding $false))
$out2 = @('date,park,category,name,times,location') + ($atmo | Sort-Object date, park, name | ForEach-Object { ($_.date, $_.park, $_.group, (Q $_.name), $_.times, '') -join ',' })
[IO.File]::WriteAllLines((Join-Path $Dir 'disney_atmosphere_times.csv'), $out2, (New-Object Text.UTF8Encoding $false))
"rows=$($rows.Count) atmo=$($atmo.Count) other=$($other.Count)"
'--- shows by park/category'
$rows | Group-Object park, group, name | ForEach-Object { $a = $_.Group; "{0} | {1} | {2} | {3} days {4}..{5}" -f $a[0].park, $a[0].group, $a[0].name, $a.Count, ($a.date | Sort-Object)[0], ($a.date | Sort-Object)[-1] }
'--- notes / odd'
$rows | Where-Object { $_.notes -or $_.times -match '-' -or -not $_.times } | ForEach-Object { "$($_.date) $($_.name) [$($_.times)] $($_.notes)" } | Select-Object -First 30
'--- atmosphere names'
$atmo | Group-Object park, name | ForEach-Object { "{0} | {1} | {2} days" -f $_.Group[0].park, $_.Group[0].name, $_.Count }

