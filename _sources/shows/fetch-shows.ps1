param([string]$Out = 'C:\GitHub\ParkPlannerDLR\_sources\shows', [string]$Start = '2026-10-26', [int]$Days = 42)
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
$raw = Join-Path $Out 'raw'; New-Item -ItemType Directory -Force $raw | Out-Null
$d0 = [datetime]::ParseExact($Start, 'yyyy-MM-dd', $null)
for ($i = 0; $i -lt $Days; $i++) {
  $d = $d0.AddDays($i).ToString('yyyy-MM-dd')
  $f = Join-Path $raw "calendar-$d.json"
  if (Test-Path $f) { continue }
  $u = "https://disneyland.disney.go.com/finder/api/v1/explorer-service/calendar/dlr/80008297;entityType=destination/$d/day/"
  try {
    $r = Invoke-WebRequest -UseBasicParsing -UserAgent $ua -Headers @{Accept = 'application/json'} $u
    $ms = New-Object IO.MemoryStream; $r.RawContentStream.Position = 0; $r.RawContentStream.CopyTo($ms)
    [IO.File]::WriteAllBytes($f, $ms.ToArray())
    "$d $($r.StatusCode) $($ms.Length)"
  } catch { "$d FAILED: $($_.Exception.Message)"; if ($_.Exception.Response.StatusCode.value__ -in 401,403,429) { break } }
  Start-Sleep -Milliseconds 1200
}
