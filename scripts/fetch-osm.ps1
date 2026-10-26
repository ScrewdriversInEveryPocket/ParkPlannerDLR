<#
.SYNOPSIS
  Downloads a fresh OpenStreetMap extract of both parks, for updating data\park_places.js.
.DESCRIPTION
  Sends two requests to the Overpass API (the same queries used for the Oct 25, 2026 extract):
  points of interest (rides, restaurants, shows, gates) and building/footpath geometry (for ride
  entrances and exits). Saves the raw answers, unchanged, to _sources\osm\. It does not change the
  app: matching rides and doors to the extract is a separate step (see UPDATING.md). Map data is
  (c) OpenStreetMap contributors, under the Open Database License; keep that credit in the app.
.EXAMPLE
  .\scripts\fetch-osm.ps1
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$dir = Join-Path (Join-Path $root '_sources') 'osm'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$day = Get-Date -Format 'yyyy-MM-dd'
$box = '33.8030,-117.9260,33.8170,-117.9150'
$queries = [ordered]@{
  "osm-dlr-$day.json" = @"
[out:json][timeout:60];
(
  nwr($box)["attraction"];
  nwr($box)["tourism"="attraction"];
  nwr($box)["amenity"~"restaurant|fast_food|cafe|ice_cream|bar|food_court"];
  nwr($box)["barrier"~"turnstile|gate|entrance"];
  nwr($box)["entrance"];
  nwr($box)["tourism"="theme_park"];
  nwr($box)["place"~"neighbourhood|locality|quarter"];
  nwr($box)["amenity"="theatre"];
);
out center tags;
"@
  "osm-dlr-geometry-$day.json" = @"
[out:json][timeout:150];
(
  way($box)["building"];
  way($box)["attraction"];
  way($box)["tourism"="attraction"];
  relation($box)["attraction"];
  relation($box)["building"];
  way($box)["highway"~"footway|pedestrian|path|steps|corridor"];
);
(._;>;);
out body;
"@
}
$servers = @('https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter')
foreach ($name in $queries.Keys) {
  $out = Join-Path $dir $name; $done = $false
  foreach ($url in $servers) {
    try {
      Invoke-WebRequest -Uri $url -Method Post -Body @{ data = $queries[$name] } -UserAgent 'ParkDayPlanner/1.0 (occasional extract)' -TimeoutSec 180 -OutFile $out -UseBasicParsing
      $n = (Get-Content $out -Raw | ConvertFrom-Json).elements.Count
      Write-Host "Saved $out ($n elements) from $url"; $done = $true; break
    } catch { Write-Warning "$url failed: $($_.Exception.Message)" }
  }
  if (-not $done) { throw "Couldn't download $name. Overpass may be busy; try again later." }
  Start-Sleep -Seconds 5
}
