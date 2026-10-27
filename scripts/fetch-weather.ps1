<#
.SYNOPSIS
  Downloads ten years of Anaheim weather history from Open-Meteo, for refreshing the weather datasets.
.DESCRIPTION
  One request to Open-Meteo's historical archive (ERA5) for the ten full years before this one,
  daily and hourly. Saves the raw answer, unchanged, to _sources\weather\. It does not change the
  app: the weekly, monthly and hourly averages are worked out from it in a separate step (see
  UPDATING.md). Open-Meteo is free for non-commercial use; credit open-meteo.com.
.EXAMPLE
  .\scripts\fetch-weather.ps1
#>
param([int]$Years = 10)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$dir = Join-Path (Join-Path $root '_sources') 'weather'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$last = (Get-Date).Year - 1; $first = $last - $Years + 1
$daily = 'temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_hours,wind_speed_10m_max,wind_gusts_10m_max,daylight_duration,sunrise,sunset'
$hourly = 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation'
$url = "https://archive-api.open-meteo.com/v1/archive?latitude=33.8121&longitude=-117.919&start_date=$first-01-01&end_date=$last-12-31&daily=$daily&hourly=$hourly&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FLos_Angeles"
$out = Join-Path $dir "open-meteo-anaheim-$first-$last.json"
Invoke-WebRequest -Uri $url -UserAgent 'ParkDayPlanner/1.0' -TimeoutSec 300 -OutFile $out -UseBasicParsing
Write-Host "Saved $out ($([math]::Round((Get-Item $out).Length / 1MB, 1)) MB, $first to $last)."
