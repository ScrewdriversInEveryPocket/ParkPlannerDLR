# Builds restrooms.csv from the newest page fetch-restrooms.ps1 saved: the two theme parks only.
# companion = yes for companion restrooms; island = yes on Tom Sawyer Island (the planner never suggests those).
param([string]$Out = 'C:\GitHub\ParkPlannerDLR\_sources\restrooms')
$page = Get-ChildItem (Join-Path $Out 'raw') -Filter 'restrooms-page*.html' | Sort-Object Name | Select-Object -Last 1
$html = [IO.File]::ReadAllText($page.FullName, [Text.Encoding]::UTF8)
$at = $html.IndexOf('"guestServicesData":')
if ($at -lt 0) { throw "No guestServicesData in $($page.Name): Disney may have changed the page" }
$parks = @{ 'disneyland-park' = 'Disneyland'; 'disney-california-adventure-park' = 'California Adventure' }
# each section starts with its id; the restroom points follow it until the next section
$sec = [regex]::Matches($html.Substring($at), '"id":"([a-z-]+)","locations":\[(.*?)\]\}')
$rows = foreach ($s in $sec) {
  $park = $parks[$s.Groups[1].Value]; if (-not $park) { continue }
  foreach ($m in [regex]::Matches($s.Groups[2].Value, '\{"lat":([-\d.]+),"lng":([-\d.]+),"name":"([^"]+)","id":"(\d+);')) {
    $n = $m.Groups[3].Value
    [pscustomobject]@{ park = $park; name = $n; lat = [math]::Round([double]$m.Groups[1].Value, 6); lon = [math]::Round([double]$m.Groups[2].Value, 6)
      companion = $(if ($n -match 'Companion') { 'yes' } else { 'no' }); island = $(if ($n -like 'Tom Sawyer Island*') { 'yes' } else { 'no' }); disney_id = $m.Groups[4].Value }
  }
}
$rows = $rows | Sort-Object @{ e = { $_.park -ne 'Disneyland' } }, name
$csv = Join-Path $Out 'restrooms.csv'
$rows | ConvertTo-Csv -NoTypeInformation | ForEach-Object { $_ -replace '"', '' } | Set-Content -Encoding UTF8 $csv
"$($rows.Count) restrooms ($(@($rows | ? park -eq 'Disneyland').Count) Disneyland, $(@($rows | ? park -eq 'California Adventure').Count) California Adventure) -> $csv"
