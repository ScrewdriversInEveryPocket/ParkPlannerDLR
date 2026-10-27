<#
.SYNOPSIS
  Compares Disney's own attraction list with data\ride_profiles.js and prints what's new, gone or different:
  minimum height, single rider line, Lightning Lane Multi Pass, virtual queue. It changes nothing in data\.
.DESCRIPTION
  Downloads (one request) Disney's attraction list feed, the one behind disneyland.disney.go.com/attractions/:
    https://disneyland.disney.go.com/finder/api/v1/explorer-service/list-ancestor-entities/dlr/80008297;entityType=destination/<date>/attractions
  into raw\attractions-<date>.json, and writes attractions.csv here (park, name, height_in, single_rider,
  multi_pass, virtual_queue, water, thrill, disney_id, url) for reference.
  Disney's facets used: height (e.g. 40-inches-102-cm-or-taller), interests=single-rider-line,
  experienceQueue=flex-rec-dlr (Lightning Lane Multi Pass), experienceQueue=VQ (virtual queue),
  thrillFactor (water-rides, big-drops, ...).
  Names are matched after taking out quotes, (TM)/(R), "Star Wars:" and punctuation; $alias below maps the few
  that still differ (Disney's name -> ride_profiles name). If a NEW line is really an existing ride under a new
  Disney name, add it to $alias rather than renaming the ride.
  What to do with each line is in UPDATING.md, ride_profiles. A NEW line is a ride to add (or a show/walk-through
  the planner doesn't need: add its normalised name to $ignore with a comment). Single Pass rides show as
  "no Multi Pass" on Disney's feed; that's expected (ride_profiles says Single Pass).
  scripts\update-data.ps1 runs this (step rides). Disney's site can't be reached from a cloud sandbox.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\_sources\rides\check-rides.ps1
#>
param([string]$Dir = $PSScriptRoot, [string]$Date = (Get-Date).ToString('yyyy-MM-dd'), [switch]$NoFetch)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $Dir -Parent) -Parent
$utf8 = New-Object Text.UTF8Encoding $false
$raw = Join-Path $Dir 'raw'; New-Item -ItemType Directory -Force $raw | Out-Null
$file = Join-Path $raw "attractions-$Date.json"
if (-not $NoFetch) {
  $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
  $u = "https://disneyland.disney.go.com/finder/api/v1/explorer-service/list-ancestor-entities/dlr/80008297;entityType=destination/$Date/attractions"
  try {
    $r = Invoke-WebRequest -UseBasicParsing -UserAgent $ua -Headers @{ Accept = 'application/json' } $u
    $ms = New-Object IO.MemoryStream; $r.RawContentStream.Position = 0; $r.RawContentStream.CopyTo($ms); [IO.File]::WriteAllBytes($file, $ms.ToArray())
  } catch { "FAILED: $($_.Exception.Message) (a 401/403/429 is a block: stop, don't get around it)"; exit 1 }
}
if (-not (Test-Path $file)) { $file = (Get-ChildItem $raw -Filter 'attractions-*.json' | Sort-Object Name | Select-Object -Last 1).FullName }
if (-not $file) { 'No attractions-*.json saved yet; run without -NoFetch.'; exit 1 }

# Disney's name (normalised) -> ride_profiles name, where taking out punctuation isn't enough
$alias = @{
  'millennium falcon smugglers run' = 'Smugglers Run'; 'big thunder mountain railroad' = 'Big Thunder Mountain'
  'star tours the adventures continue' = 'Star Tours'; 'the many adventures of winnie the pooh' = 'Winnie the Pooh'
  'guardians of the galaxy mission breakout' = 'Guardians - Mission: BREAKOUT!'; 'web slingers a spiderman adventure' = 'WEB SLINGERS'
  'soarin around the world' = "Soarin'"; 'monsters inc mike sulley to the rescue' = 'Monsters, Inc.'
  'the little mermaid ariels undersea adventure' = 'The Little Mermaid'
  # seasonal overlays and alternate films: the same ride in ride_profiles
  'guardians of the galaxy monsters after dark' = 'Guardians - Mission: BREAKOUT!'; 'soarin over california' = "Soarin'"; 'soarin across america' = "Soarin'"
  'pixar palaround swinging' = 'Pixar Pal-A-Round'; 'pixar palaround nonswinging' = 'Pixar Pal-A-Round'
  'its a small world holiday' = "it's a small world"; 'haunted mansion holiday' = 'Haunted Mansion'; 'hyperspace mountain' = 'Space Mountain'
  'maters graveyard jambooree' = "Mater's Junkyard Jamboree"; 'maters jingle jamboree' = "Mater's Junkyard Jamboree"
  'luigis joy to the whirl' = "Luigi's Rollickin' Roadsters"
}
# Disney attractions not in ride_profiles as of Oct 27, 2026 (normalised names): walk-throughs, shows, play areas,
# transport, seasonal party extras, and rides the planner doesn't schedule. Only attractions NOT here print as NEW.
# To start planning one of these, take it off this list and add it to ride_profiles (UPDATING.md, New ride).
$ignore = @(
  'animation academy', 'games of pixar pier', 'holiday decor', 'mickeys philharmagic', 'redwood creek challenge trail', 'sorcerers workshop',
  'the bakery tour', 'treat trails at oogie boogie bash', 'turtle talk with crush', 'villains grove at oogie boogie bash',
  'adventureland treehouse inspired by walt disneys swiss family robinson', 'astro orbitor', 'casey jr circus train', 'centoonial park',
  'davy crocketts explorer canoes', 'disneyland monorail', 'disneyland railroad', 'donalds duck pond', 'fortune tellers',
  'frontierland shootin exposition', 'goofys howtoplay yard', 'great moments with mr lincoln', 'king arthur carrousel', 'mad tea party',
  'main street cinema', 'main street vehicles', 'mark twain riverboat', 'minnies house', 'opera house', 'pinocchios daring journey',
  'pirates lair on tom sawyer island', 'pixar short film spotlight', 'sailing ship columbia', 'sleeping beauty castle walkthrough',
  'storybook land canal boats', 'the disney gallery', 'walt disney a magical life', 'walt disneys enchanted tiki room'
)
function Norm([string]$s) {
  $s = $s.Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', ''
  $s = $s.ToLower() -replace [char]0x2122, '' -replace [char]0x00AE, '' -replace '^star wars: ', '' -replace '[^a-z0-9 ]', '' -replace '\s+', ' '
  $s.Trim()
}
$parks = @{ '330339;entityType=theme-park' = 'Disneyland'; '336894;entityType=theme-park' = 'California Adventure' }
$j = [IO.File]::ReadAllText($file, [Text.Encoding]::UTF8) | ConvertFrom-Json
$dis = foreach ($a in $j.results | Where-Object entityType -eq 'Attraction') {
  $park = @($a.parkIds | ForEach-Object { $parks[$_] } | Where-Object { $_ })[0]; if (-not $park) { continue }
  $f = $a.facets
  $h = @($f.height | Where-Object { $_ -match '^(\d+)-inches' } | ForEach-Object { [int]($_ -replace '-.*', '') })[0]
  [pscustomobject][ordered]@{ park = $park; name = ($a.name -replace [char]0x00A0, ' ').Trim(); height_in = $(if ($h) { $h } else { '' })
    single_rider = $(if ($f.interests -contains 'single-rider-line') { 'yes' } else { 'no' })
    multi_pass = $(if ($f.experienceQueue -contains 'flex-rec-dlr') { 'yes' } else { 'no' })
    virtual_queue = $(if ($f.experienceQueue -contains 'VQ') { 'yes' } else { 'no' })
    water = $(if ($f.thrillFactor -contains 'water-rides') { 'yes' } else { 'no' })
    thrill = (@($f.thrillFactor) -join ';'); disney_id = $a.facilityId; url = [string]$a.webLinks.wdwDetails.href }
}
$dis = @($dis | Sort-Object park, name)
$dis | ConvertTo-Csv -NoTypeInformation | ForEach-Object { $_ -replace '"([^",]*)"', '$1' } | Set-Content -Encoding utf8 (Join-Path $Dir 'attractions.csv')

$js = [IO.File]::ReadAllText((Join-Path $root 'data\ride_profiles.js'), $utf8)
$ours = @([regex]::Match($js, '(?s)\}, `(.*?)\r?\n`\);').Groups[1].Value | ConvertFrom-Csv)
$byKey = @{}; foreach ($o in $ours) { $byKey["$($o.park)|$(Norm $o.ride)"] = $o }

"Disney lists $($dis.Count) attractions in the two parks; ride_profiles has $($ours.Count) rows. ($([IO.Path]::GetFileName($file)))"
# group Disney's entries by the ride they match (an overlay and the regular ride count as one: any "yes" wins)
$match = @{}
foreach ($d in $dis) {
  $n = Norm $d.name; if ($alias[$n]) { $n = Norm $alias[$n] }
  if ($ignore -contains $n) { continue }
  $o = $byKey["$($d.park)|$n"]
  if (-not $o) { "NEW on Disney's list: $($d.park) | $($d.name) | height $(if ($d.height_in) { "$($d.height_in) in" } else { 'any' }) | multi pass $($d.multi_pass) | $($d.thrill)"; continue }
  if (-not $match[$o.ride]) { $match[$o.ride] = @() }; $match[$o.ride] += $d
}
foreach ($o in $ours) {
  $ds = $match[$o.ride]
  if (-not $ds) { if ($o.kind -ne 'Character meet') { "GONE from Disney's list (closed for good, renamed, or a name to add to `$alias): $($o.park) | $($o.ride)" }; continue }
  $h = ($ds | Where-Object height_in | ForEach-Object { [int]$_.height_in } | Measure-Object -Maximum).Maximum
  $sr = [bool]($ds | Where-Object single_rider -eq 'yes'); $mp = [bool]($ds | Where-Object multi_pass -eq 'yes')
  $hOurs = if ($o.min_height_in) { [int]$o.min_height_in } else { $null }
  if ($hOurs -ne $h) { "HEIGHT differs: $($o.ride): ride_profiles $(if ($hOurs) { "$hOurs in" } else { 'none' }), Disney $(if ($h) { "$h in" } else { 'any height' })" }
  if (($o.single_rider -eq 'Yes') -ne $sr) { "SINGLE RIDER differs: $($o.ride): ride_profiles '$($o.single_rider)', Disney $(if ($sr) { 'yes' } else { 'no' })" }
  if ($o.lightning_lane -ne 'Single Pass' -and (($o.lightning_lane -eq 'Multi Pass') -ne $mp)) { "LIGHTNING LANE differs: $($o.ride): ride_profiles '$($o.lightning_lane)', Disney Multi Pass $(if ($mp) { 'yes' } else { 'no' })" }
}
