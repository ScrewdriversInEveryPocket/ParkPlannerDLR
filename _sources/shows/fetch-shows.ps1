# Downloads Disney's day calendar feed (the one behind disneyland.disney.go.com/calendars/day/) for the next
# -Days days into raw\calendar-<date>.json, about 1 request a second. Each day holds both parks' hours, showtimes,
# ticketed parties and closed facilities. Then run parse-shows.ps1. Re-downloads days already saved, since Disney
# changes hours; -SkipExisting resumes after a failure instead. Stops on 401/403/429 (never get around a block).
# Disney answers 403 for the first date past what it has published (about six weeks out), so a run normally ends
# with one "FAILED: (403) Forbidden" line: that is the end of the calendar, not a block. A 403 on the FIRST date is a block.
# Disney's site can't be reached from a cloud sandbox, so run this on a PC. scripts\update-data.ps1 runs it for you.
param([string]$Out = $PSScriptRoot, [string]$Start = (Get-Date).ToString('yyyy-MM-dd'), [int]$Days = 42, [switch]$SkipExisting)
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
$raw = Join-Path $Out 'raw'; New-Item -ItemType Directory -Force $raw | Out-Null
$d0 = [datetime]::ParseExact($Start, 'yyyy-MM-dd', $null)
for ($i = 0; $i -lt $Days; $i++) {
  $d = $d0.AddDays($i).ToString('yyyy-MM-dd')
  $f = Join-Path $raw "calendar-$d.json"
  if ($SkipExisting -and (Test-Path $f)) { continue }
  $u = "https://disneyland.disney.go.com/finder/api/v1/explorer-service/calendar/dlr/80008297;entityType=destination/$d/day/"
  try {
    $r = Invoke-WebRequest -UseBasicParsing -UserAgent $ua -Headers @{Accept = 'application/json'} $u
    $ms = New-Object IO.MemoryStream; $r.RawContentStream.Position = 0; $r.RawContentStream.CopyTo($ms)
    [IO.File]::WriteAllBytes($f, $ms.ToArray())
    "$d $($r.StatusCode) $($ms.Length)"
  } catch { "$d FAILED: $($_.Exception.Message)"; if ($_.Exception.Response.StatusCode.value__ -in 401,403,429) { break } }
  Start-Sleep -Milliseconds 1200
}
