# Builds disney_dining.csv (and disney_dining_hours.csv) from the files fetch-dining.ps1 saved.
# Only places inside Disneyland park or Disney California Adventure; lands use Disney's own labels.
param([string]$Out = $PSScriptRoot, [string]$Date = '')
$raw = Join-Path $Out 'raw'
if (-not $Date) { $Date = (Get-ChildItem $raw -Filter 'dining-list-*.json' | Sort-Object Name | Select-Object -Last 1).BaseName.Substring(12) }
function Read-Json($f) { [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8) | ConvertFrom-Json }
function Strip($s) { (($s -replace '<[^>]+>', ' ') -replace '&nbsp;', ' ' -replace '\s+', ' ').Trim() }

$list = Read-Json (Join-Path $raw "dining-list-$Date.json")
$parkName = @{ '330339;entityType=theme-park' = 'Disneyland'; '336894;entityType=theme-park' = 'California Adventure' }
$facetName = @{}; foreach ($f in $list.filters.flatFacets) { $facetName[$f.urlFriendlyId] = $f.value }
$mealMap = [ordered]@{ 'Breakfast' = 'breakfast'; 'Brunch' = 'breakfast;lunch'; 'Lunch and Dinner' = 'lunch;dinner'; 'Lunch' = 'lunch';
  'Dinner' = 'dinner'; 'Snack' = 'snacks'; 'Lounge' = 'lounge'; 'Late Night' = 'late-night' }

$rows = @(); $hours = @()
foreach ($r in $list.results) {
  $parks = @($r.parkIds | Where-Object { $parkName.ContainsKey($_) } | ForEach-Object { $parkName[$_] })
  if (-not $parks) { continue }
  $f = $r.facets
  $df = Join-Path $raw "detail\$($r.urlFriendlyId).json"
  $d = if (Test-Path $df) { Read-Json $df } else { $null }
  $all = @($f.PSObject.Properties | ForEach-Object { $_.Value }) | ForEach-Object { $_ }
  $kbyg = @($d.knowBeforeYouGo.items | ForEach-Object { [pscustomobject]@{ t = Strip $_.title; c = Strip $_.content } })

  # land: Disney's breadcrumb is "<land> > <park>"
  $crumb = @($d.aagData.breadcrumb.data.label)
  $land = if ($crumb.Count -ge 2 -and $crumb[-1] -match 'Park$') { $crumb[0] } else { '' }


  $resItem = ($kbyg | Where-Object { $_.t -match '^Reservations' } | Select-Object -First 1).c
  $noRes = ($kbyg.c -join ' ') -match 'Reservations are not offered for this'
  $reservations = if ($noRes) { 'none' }
    elseif ($r.entityType -eq 'Dining-Event') { 'required' }
    elseif ($resItem -match 'highly recommended') { 'recommended' }
    elseif ($resItem -or $all -contains 'reservations-accepted') { 'accepted' }
    else { 'none' }
  $walkup = if ($all -contains 'walkupWaitList') { 'yes' } else { 'no' }
  $mobile = if ($all -contains 'mobile-orders') { 'yes' } else { 'no' }
  $price = @($f.priceRange)[0]

  $meals = @()
  foreach ($t in @($d.featuredMenuItems.mealPeriods.title)) {
    foreach ($k in $mealMap.Keys) { if ($t -like "$k Menu*") { $meals += $mealMap[$k] -split ';'; break } }
  }
  foreach ($m in 'breakfast', 'lunch', 'dinner') { if ($f.tableService -contains $m) { $meals += $m } }
  $order = 'breakfast', 'lunch', 'dinner', 'snacks', 'lounge', 'late-night'
  $meals = $order | Where-Object { $meals -contains $_ }

  # type: Disney's facets first; places whose only menu is snacks count as Snacks
  $isTS = $all -contains 'table-service'
  $isBar = ($all -contains 'bars-and-lounges') -or ($all -contains 'lounges-bars')
  $meal3 = @($meals | Where-Object { $_ -in 'breakfast', 'lunch', 'dinner' })
  $type = if ($r.entityType -eq 'Dining-Event') { 'Dining Event' }
    elseif ($all -contains 'character-dining') { 'Character Dining' }
    elseif ($isTS -and $meal3) { 'Table Service' }
    elseif ($isBar -or ($meals -contains 'lounge' -and -not $meal3)) { 'Lounge' }
    elseif ($isTS) { 'Table Service' }
    elseif ($r.name -match 'Festival|Marketplace|Lunar New Year|Sip and Savor') { 'Festival Booths' }
    elseif (-not $meal3) { 'Snacks' }
    elseif (($all -contains 'quick-service') -or ($all -contains 'quick-service-rec') -or ($all -contains 'carts-kiosks')) { 'Quick Service' }
    else { $r.facetGroupType }
  if (-not $price -and $d.structuredData.priceRange) { $price = ($d.structuredData.priceRange -split ' ')[0] }

  $cuisine = @($f.cuisine | Where-Object { $_ -match '-cuisine' } | ForEach-Object { if ($facetName[$_]) { $facetName[$_] } else { $_ } })

  $notes = @()
  $sch = @($r.schedule.schedules)
  if ($sch | Where-Object { $_.isClosed -or $_.type -eq 'Closed' }) { $notes += "Closed on $Date" }
  elseif ($r.schedule -and -not $sch) { $notes += "No hours listed for $Date" }
  if ($r.name -match 'Magic Key') { $notes += 'Magic Key holders only' }
  if ($r.name -match 'Festival|Marketplace|Lunar New Year|Sip and Savor') { $notes += 'Seasonal festival only' }
  if ($r.name -match 'Oogie Boogie Bash') { $notes += 'Separate-ticket party only' }
  if ($r.entityType -eq 'Dining-Event' -and $r.restaurants) { $notes += 'Package or event at ' + (@($r.restaurants.name) -join ' / ') }
  if ($parks.Count -gt 1 -or $r.locationName -eq 'Multiple Locations') { $notes += 'Several locations; map point is one of them' }
  if ($noRes) { $notes += 'Walk-up only, may have a standby line' }
  if ($resItem -match 'not offered for (.+?) but are available for (.+?)\.') { $notes += "Reservations only for $($Matches[2])" }
  foreach ($k in $kbyg) {
    if ($k.t -match 'Closed for Fireworks') { $notes += 'May close for fireworks' }
    elseif ($k.t -match 'Character Dining Only Available During (\w+)') { $notes += "Characters at $($Matches[1].ToLower()) only" }
    elseif ($k.t -match 'temporarily closed|refurbish' -or $k.c -match "$([regex]::Escape($r.name)) is temporarily closed") { $notes += $k.t }
  }

  # Disney's page link; a few carts have none in the feed
  $url = [string]$r.webLinks.dlrDetails.href; if (-not $url -and "$($r.url)" -like '/*') { $url = [string]$r.url }
  $url = $url -replace '^http:', 'https:' -replace '^/', 'https://disneyland.disney.go.com/'
  $rows += [pscustomobject][ordered]@{
    park = $parks -join ';'; land = $land; name = $r.name; type = $type; reservations = $reservations; walkup = $walkup
    mobile_order = $mobile; price = $price; meals = $meals -join ';'; cuisine = $cuisine -join ';'
    lat = $r.marker.lat; lon = $r.marker.lng; disney_id = $r.facilityId; url = $url; note = $notes -join '; '
  }

  # Hours for the next week, from the detail page's structured data (dates from validFrom..validThrough)
  foreach ($h in @($d.structuredData.openingHoursSpecification)) {
    if (-not $h.validFrom) { continue }
    $a = [datetime]$h.validFrom; $b = [datetime]$h.validThrough
    for ($x = $a; $x -le $b; $x = $x.AddDays(1)) {
      if ($h.dayOfWeek -contains $x.DayOfWeek.ToString()) {
        $hours += [pscustomobject][ordered]@{ disney_id = $r.facilityId; name = $r.name; date = $x.ToString('yyyy-MM-dd'); open = $h.opens; close = $h.closes; kind = $h.description }
      }
    }
  }
}

$rows = $rows | Sort-Object park, land, name
$rows | ConvertTo-Csv -NoTypeInformation | ForEach-Object { $_ -replace '"([^",]*)"', '$1' } |
  Set-Content -Encoding utf8 (Join-Path $Out 'disney_dining.csv')
$hours | Sort-Object name, date, open | ConvertTo-Csv -NoTypeInformation | ForEach-Object { $_ -replace '"([^",]*)"', '$1' } |
  Set-Content -Encoding utf8 (Join-Path $Out 'disney_dining_hours.csv')
"$($rows.Count) places, $($hours.Count) hour rows"
