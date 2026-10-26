# Saves Disney's restroom map page (one request). Every restroom's map point is in the page's guestServicesData block.
# Then run parse-restrooms.ps1. Disney's site can't be reached from a cloud sandbox, so run this on a PC.
param([string]$Out = 'C:\GitHub\ParkPlannerDLR\_sources\restrooms')
$raw = Join-Path $Out 'raw'; New-Item -ItemType Directory -Force $raw | Out-Null
$date = (Get-Date).ToString('yyyy-MM-dd'); $file = Join-Path $raw "restrooms-page-$date.html"
try {
  Invoke-WebRequest -UseBasicParsing -OutFile $file 'https://disneyland.disney.go.com/guest-services/restrooms/'
  "Saved $file ($((Get-Item $file).Length) bytes)"
} catch { "FAILED: $($_.Exception.Message)" }
