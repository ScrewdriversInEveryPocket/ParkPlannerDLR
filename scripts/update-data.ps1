<#
.SYNOPSIS
  The one entry point for refreshing the bundled data. Runs every scripted refresh, imports what changed,
  bumps the version once, adds the CHANGELOG line, runs the tests, and lists what is still due by hand.
.DESCRIPTION
  Steps (pick some with -Only; each one is skipped, with a reason, if its source is blocked):

    calendar   _sources\shows\fetch-shows.ps1 (Disney's day calendar, next 42 days, ~1 request a second)
               then _sources\shows\parse-shows.ps1, which writes the CSVs for
               data\park_hours_published.js and data\disney_showtimes.js. Each is imported (with
               import-dataset.ps1 -NoBump) only if its CSV changed; until = its last date, review = 14 days
               before that. Also compares Disney's "closed for refurbishment" list with data\refurbs.js and
               prints any ride that needs adding or checking (refurbs.js notes are written by hand).
    restrooms  _sources\restrooms\fetch-restrooms.ps1 then parse-restrooms.ps1; imports data\restrooms.js
               if the CSV changed; review = a year from today.
    dining     _sources\dining\fetch-dining.ps1 then parse-dining.ps1 (~150 requests). Not imported:
               data\dining.js uses the app's own lands and kinds, so this prints the restaurants Disney
               lists that dining.js lacks, and the reverse, for the hand step in UPDATING.md (dining).

  Safety: a new CSV that would cover fewer dates (hours, showtimes) or under 80% of the rows (restrooms)
  than the current file is NOT imported, since that usually means a blocked or partial download.
  If anything was imported: backups go to _BACKUP\<date>-before-<id>\, version.js is bumped once
  (bump-version.ps1) with a CHANGELOG line, and scripts\test.ps1 runs (skip with -NoTest).
  Test differences after a data refresh are expected: read them, then run .\scripts\test.ps1 -Update.

  Last, it reads every data\*.js header and lists datasets whose review date has passed or whose until
  date is within 45 days: those have no script (refurbs, events, ticket prices, ...) and are refreshed
  by hand following UPDATING.md.

  Disney's site can't be reached from a cloud sandbox; run this on the owner's PC. Never get around a block.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\update-data.ps1
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\update-data.ps1 -Only calendar
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\update-data.ps1 -NoFetch -NoTest   # re-parse what's already downloaded
#>
param([ValidateSet('calendar', 'restrooms', 'dining')][string[]]$Only = @('calendar', 'restrooms', 'dining'),
      [switch]$NoFetch, [switch]$NoTest)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path $root '_sources'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$inv = [Globalization.CultureInfo]::InvariantCulture
$today = Get-Date
$ps = { param($file, [object[]]$a) & powershell -NoProfile -ExecutionPolicy Bypass -File $file @a }
$changed = @(); $notes = @(); $summary = @()

function DataFile($id) { Join-Path (Join-Path $root 'data') "$id.js" }
function DataCsv($id) {
  $js = [IO.File]::ReadAllText((DataFile $id), $utf8)
  [regex]::Match($js, '(?s)\}, `(.*?)\r?\n`\);\s*$').Groups[1].Value -replace "`r", ''
}
function Head($id, $key) { [regex]::Match([IO.File]::ReadAllText((DataFile $id), $utf8), "(?m)^\s*$key\s*:\s*""([^""]*)""").Groups[1].Value }
function ReadCsv($f) { ([IO.File]::ReadAllText($f, $utf8).TrimStart([char]0xFEFF) -replace "`r", '').TrimEnd("`n") }
function LastDate($csv) { ($csv -split "`n" | Select-Object -Skip 1 | ForEach-Object { $_.Substring(0, 10) } | Sort-Object)[-1] }
function Nice($d) { ([datetime]::ParseExact($d, 'yyyy-MM-dd', $inv)).ToString('MMM d, yyyy', $inv) }
function Import($id, $csvFile, $until, $review) {
  $a = @($id, '-Csv', $csvFile, '-NoBump'); if ($until) { $a += '-Until', $until }; if ($review) { $a += '-Review', $review }
  & $ps (Join-Path $PSScriptRoot 'import-dataset.ps1') $a | Write-Host
  if ($LASTEXITCODE) { throw "import-dataset.ps1 $id failed." }
}

# ---------- calendar: park hours, showtimes, closures ----------
if ($Only -contains 'calendar') {
  Write-Host "`n=== Disney calendar (hours, showtimes, closures)"
  if (-not $NoFetch) { & $ps (Join-Path $src 'shows\fetch-shows.ps1') @() | Write-Host }
  $parse = & $ps (Join-Path $src 'shows\parse-shows.ps1') @()
  $parse | Select-Object -First 1 | Write-Host
  foreach ($set in @(@{ id = 'park_hours_published'; csv = (Join-Path $src 'park_hours\park_hours_published.csv'); what = 'park hours' },
                     @{ id = 'disney_showtimes'; csv = (Join-Path $src 'shows\disney_showtimes.csv'); what = 'showtimes' })) {
    $new = ReadCsv $set.csv; $old = DataCsv $set.id
    $oldUntil = Head $set.id 'until'
    if (($new -split "`n").Count -lt 2) { $summary += "$($set.what): NOT imported, the download had no dates (blocked?). Still through $(Nice $oldUntil)."; continue }
    # keep the current file's rows from before the first downloaded date (past days; harmless), so a refresh only adds
    $lines = $new -split "`n"; $first = ($lines | Select-Object -Skip 1 | ForEach-Object { $_.Substring(0, 10) } | Sort-Object)[0]
    $keepOld = @($old -split "`n" | Select-Object -Skip 1 | Where-Object { $_.Substring(0, 10) -lt $first })
    if ($keepOld) {
      $byPark = @($keepOld) + @($lines | Select-Object -Skip 1)
      if ($set.id -eq 'park_hours_published') { $byPark = $byPark | Sort-Object @{ e = { $_ -notmatch ',Disneyland,' } }, @{ e = { $_.Substring(0, 10) } } }
      $new = (@($lines[0]) + $byPark) -join "`n"
      $set.csv = Join-Path $src "edit\$($set.id).csv"; New-Item -ItemType Directory -Force (Split-Path $set.csv) | Out-Null
      [IO.File]::WriteAllText($set.csv, $new + "`n", $utf8)
    }
    $until = LastDate $new
    if ($until -lt $oldUntil) { $summary += "$($set.what): NOT imported, the download ends $(Nice $until), before the current $(Nice $oldUntil) (partial download?)."; continue }
    if ($new -eq $old) { $summary += "$($set.what): no change, through $(Nice $until)."; continue }
    $review = ([datetime]::ParseExact($until, 'yyyy-MM-dd', $inv)).AddDays(-14).ToString('yyyy-MM-dd')
    Import $set.id $set.csv $until $review
    $changed += $set.id; $notes += "$($set.what) through $(Nice $until)"; $summary += "$($set.what): updated, now through $(Nice $until)."
  }
  # Disney's closed-for-refurbishment list against refurbs.js (rides only; restaurants are listed for information)
  $rides = @{}; foreach ($r in (DataCsv 'ride_profiles' | ConvertFrom-Csv)) { $rides[($r.park + '|' + $r.ride).ToLower()] = $r.ride }
  $refurbs = @(DataCsv 'refurbs' | ConvertFrom-Csv)
  $closed = $parse | Select-Object -Skip ([array]::IndexOf(@($parse), ($parse | Where-Object { $_ -like '--- closed for*' })) + 1)
  foreach ($c in $closed) {
    $p = $c -split ' \| '; $name = ($p[1] -replace '"', '' -replace ' - Temporarily Unavailable$', '').Trim()
    $start, $end = $p[2] -split ' to '
    $ride = $rides[($p[0] + '|' + $name).ToLower()]
    if (-not $ride) { $summary += "  closed (not a ride in ride_profiles, no action): $($p[0]) | $name | $($p[2])"; continue }
    $have = $refurbs | Where-Object { $_.ride -eq $ride -and $_.park -eq $p[0] }
    if (-not $have) { $summary += "  REFURB TO ADD to data\refurbs.js: $ride, $($p[0]), $start to $end (Disney's calendar; the end is only as far as the calendar reaches)" }
    elseif (-not ($have | Where-Object { $_.start -le $start -and (-not $_.end -or $_.end -ge $end) })) { $summary += "  REFURB TO CHECK in data\refurbs.js: $ride, Disney says closed $start to $end; refurbs.js has $(($have | ForEach-Object { "$($_.start) to $($_.end)" }) -join ', ')" }
  }
}

# ---------- restrooms ----------
if ($Only -contains 'restrooms') {
  Write-Host "`n=== Restrooms"
  if (-not $NoFetch) { & $ps (Join-Path $src 'restrooms\fetch-restrooms.ps1') @() | Write-Host }
  & $ps (Join-Path $src 'restrooms\parse-restrooms.ps1') @() | Write-Host
  $f = Join-Path $src 'restrooms\restrooms.csv'
  $new = ReadCsv $f; $old = DataCsv 'restrooms'
  $nn = ($new -split "`n").Count - 1; $no = ($old -split "`n").Count - 1
  if ($nn -lt 0.8 * $no) { $summary += "restrooms: NOT imported, only $nn rows against $no now (Disney changed the page?)." }
  elseif ($new -eq $old) { $summary += "restrooms: no change ($no)." }
  else {
    Import 'restrooms' $f '' $today.AddYears(1).ToString('yyyy-MM-dd')
    $changed += 'restrooms'; $notes += 'restrooms'; $summary += "restrooms: updated, $no -> $nn."
  }
}

# ---------- dining (report only) ----------
if ($Only -contains 'dining') {
  Write-Host "`n=== Dining (report only)"
  if (-not $NoFetch) { & $ps (Join-Path $src 'dining\fetch-dining.ps1') @() | Select-Object -Last 3 | Write-Host }
  & $ps (Join-Path $src 'dining\parse-dining.ps1') @() | Write-Host
  $disney = @(ReadCsv (Join-Path $src 'dining\disney_dining.csv') | ConvertFrom-Csv)
  $ours = @(DataCsv 'dining' | ConvertFrom-Csv | ForEach-Object name)
  $skip = 'Dining Event|Festival Booths'
  $add = $disney | Where-Object { $_.name -notin $ours -and $_.type -notmatch $skip -and $_.note -notmatch 'Magic Key|Separate-ticket' }
  $gone = $ours | Where-Object { $_ -notin $disney.name }
  if (-not $add -and -not $gone) { $summary += 'dining: Disney''s list matches data\dining.js by name.' }
  foreach ($a in $add) { $summary += "  DINING TO ADD (by hand, see UPDATING.md dining): $($a.park) | $($a.name) | $($a.type) | $($a.note)" }
  foreach ($g in $gone) { $summary += "  DINING NOT ON DISNEY'S LIST (closed or renamed? check): $g" }
}

# ---------- version, changelog, tests ----------
$test = 'not run (nothing changed)'
if ($changed) {
  $note = 'Refreshed from Disney''s site: ' + ($notes -join '; ') + '.'
  $v = & $ps (Join-Path $PSScriptRoot 'bump-version.ps1') @('-Note', $note)
  $summary += "version.js is now $v; CHANGELOG line added: $note"
  if (-not $NoTest) {
    Write-Host "`n=== Tests (about two minutes)"
    & $ps (Join-Path $PSScriptRoot 'test.ps1') @() | Write-Host
    $test = if ($LASTEXITCODE) { 'FAILED or plans changed: read the list above. If the differences come from the new data, run .\scripts\test.ps1 -Update' } else { 'passed' }
  } else { $test = 'skipped (-NoTest): run .\scripts\test.ps1' }
}
$summary += "tests: $test"

# ---------- what's due by hand ----------
$due = foreach ($f in Get-ChildItem (Join-Path $root 'data') -Filter '*.js' | Where-Object Name -ne 'manifest.js') {
  $id = $f.BaseName; $u = Head $id 'until'; $r = Head $id 'review'
  if ($id -in 'park_hours_published', 'disney_showtimes', 'restrooms') { continue }   # scripted above; Disney only publishes ~6 weeks ahead
  $why = @()
  if ($r -and $r -le $today.ToString('yyyy-MM-dd')) { $why += "review was $r" }
  if ($u -and $u -le $today.AddDays(45).ToString('yyyy-MM-dd')) { $why += "covers only to $u" }
  if ($why) { "  $id ($($why -join ', '))" }
}
Write-Host "`n=== Summary"
$summary | Write-Host
Write-Host $(if ($due) { "Due by hand (UPDATING.md, each dataset's section):" } else { 'Nothing else is due.' })
$due | Write-Host
