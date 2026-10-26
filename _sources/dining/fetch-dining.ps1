# Downloads Disney's own dining list feed for Disneyland Resort, then one detail record per
# dining location inside Disneyland park or Disney California Adventure. About 1 request a second.
# Skips files already downloaded, so it can be re-run after a failure. Stops on 401/403/429.
param([string]$Out = 'C:\GitHub\ParkPlannerDLR\_sources\dining', [string]$Date = (Get-Date).ToString('yyyy-MM-dd'),
      [string[]]$Extra = @('ariels-grotto'))
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
$raw = Join-Path $Out 'raw'; New-Item -ItemType Directory -Force (Join-Path $raw 'detail') | Out-Null
$base = 'https://disneyland.disney.go.com/finder/api/v1/explorer-service'
$parks = '330339;entityType=theme-park', '336894;entityType=theme-park'

function Get-Json([string]$u, [string]$f) {
  if (Test-Path $f) { return $true }
  try {
    $r = Invoke-WebRequest -UseBasicParsing -UserAgent $ua -Headers @{Accept = 'application/json'} $u
    $ms = New-Object IO.MemoryStream; $r.RawContentStream.Position = 0; $r.RawContentStream.CopyTo($ms)
    [IO.File]::WriteAllBytes($f, $ms.ToArray())
    "$($r.StatusCode) $($ms.Length) $u"
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    "FAILED $code $u : $($_.Exception.Message)"
    if ($code -in 401, 403, 429) { throw "Blocked ($code); stopping." }
  }
  Start-Sleep -Milliseconds 1100
}

$listFile = Join-Path $raw "dining-list-$Date.json"
Get-Json "$base/list-ancestor-entities/dlr/80008297;entityType=destination/$Date/dining" $listFile
$list = [IO.File]::ReadAllText($listFile, [Text.Encoding]::UTF8) | ConvertFrom-Json
$slugs = $list.results | Where-Object { @($_.parkIds | Where-Object { $_ -in $parks }).Count } | ForEach-Object urlFriendlyId
foreach ($s in @($slugs) + $Extra | Select-Object -Unique) {
  Get-Json "$base/details-entity-simple/dlr/$s/$Date/" (Join-Path $raw "detail\$s.json")
}
