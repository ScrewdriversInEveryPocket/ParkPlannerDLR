<#
.SYNOPSIS
  Serves the app folder at http://localhost:8000/ so check.html, the tests and the offline cache work locally.
.DESCRIPTION
  A small web server in plain PowerShell (nothing to install). It only answers this computer, and only hands
  out files from the app folder. Press Ctrl+C to stop it.
  The test page (tests\run.html) saves its results through it, into tests\results\ and tests\golden\ only.
  You don't need this to use the app: index.html still opens straight from the folder.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\serve.ps1
  Then open http://localhost:8000/ (the app), http://localhost:8000/check.html or http://localhost:8000/tests/run.html
#>
param([int]$Port = 8000, [switch]$Quiet)
$root = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.ico' = 'image/x-icon'
  '.webmanifest' = 'application/manifest+json'; '.md' = 'text/plain; charset=utf-8'; '.txt' = 'text/plain; charset=utf-8'
  '.csv' = 'text/plain; charset=utf-8'; '.pdf' = 'application/pdf'
}

function Send($stream, [int]$code, [string]$type, [byte[]]$body) {
  $reason = @{ 200 = 'OK'; 403 = 'Forbidden'; 404 = 'Not Found'; 405 = 'Method Not Allowed' }[$code]
  $head = "HTTP/1.1 $code $reason`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
  $h = [Text.Encoding]::ASCII.GetBytes($head)
  $stream.Write($h, 0, $h.Length); if ($body.Length) { $stream.Write($body, 0, $body.Length) }
}
function Text([string]$s) { [Text.Encoding]::UTF8.GetBytes($s) }

# read one request: the header lines, then a body of Content-Length bytes
function Read-Request($stream) {
  $buf = New-Object IO.MemoryStream; $one = New-Object byte[] 1; $tail = 0
  while ($tail -ne 0x0D0A0D0A) {
    if ($stream.Read($one, 0, 1) -le 0) { return $null }
    $buf.WriteByte($one[0]); $tail = (($tail -shl 8) -bor $one[0]) -band 0xFFFFFFFF
    if ($buf.Length -gt 65536) { return $null }
  }
  $lines = [Text.Encoding]::ASCII.GetString($buf.ToArray()) -split "`r`n"
  $first = $lines[0] -split ' '
  $len = 0; foreach ($l in $lines) { if ($l -match '^Content-Length:\s*(\d+)') { $len = [int]$Matches[1] } }
  $body = New-Object byte[] $len; $got = 0
  while ($got -lt $len) { $n = $stream.Read($body, $got, $len - $got); if ($n -le 0) { break }; $got += $n }
  return @{ Method = $first[0]; Target = $first[1]; Body = $body }
}

function Handle($client) {
  $stream = $client.GetStream(); $stream.ReadTimeout = 10000
  try {
    $req = Read-Request $stream; if (-not $req) { return }
    $path, $query = $req.Target -split '\?', 2
    $path = [Uri]::UnescapeDataString($path)
    if ($req.Method -eq 'POST' -and $path -eq '/__save') {
      # test results and expected plans only
      $file = ''; if ($query -match '(^|&)file=([^&]*)') { $file = [Uri]::UnescapeDataString($Matches[2]) }
      if ($file -notmatch '^tests/(results|golden)/[\w.-]+\.json$') { Send $stream 403 'text/plain' (Text 'not allowed'); return }
      $full = Join-Path $root ($file -replace '/', '\')
      New-Item -ItemType Directory -Force (Split-Path $full) | Out-Null
      [IO.File]::WriteAllBytes($full, $req.Body)
      if (-not $Quiet) { "saved $file" }
      Send $stream 200 'text/plain' (Text 'ok'); return
    }
    if ($req.Method -ne 'GET' -and $req.Method -ne 'HEAD') { Send $stream 405 'text/plain' (Text 'GET only'); return }
    $full = [IO.Path]::GetFullPath((Join-Path $root ($path.TrimStart('/') -replace '/', '\')))
    if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { Send $stream 403 'text/plain' (Text 'outside the app folder'); return }
    if (Test-Path -LiteralPath $full -PathType Container) { $full = Join-Path $full 'index.html' }
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { Send $stream 404 'text/plain' (Text "not found: $path"); if (-not $Quiet) { "404 $path" }; return }
    $type = $types[[IO.Path]::GetExtension($full).ToLower()]; if (-not $type) { $type = 'application/octet-stream' }
    $bytes = [IO.File]::ReadAllBytes($full)
    if ($req.Method -eq 'HEAD') { $bytes = [byte[]]@() }
    Send $stream 200 $type $bytes
  } catch { } finally { $client.Close() }
}

$listener = New-Object Net.Sockets.TcpListener ([Net.IPAddress]::Loopback, $Port)
try { $listener.Start() } catch { Write-Error "Port $Port is in use. Is the server already running? Try -Port 8001."; exit 1 }
if (-not $Quiet) { "Serving $root at http://localhost:$Port/  (Ctrl+C to stop)" }
# browsers open spare connections they may never use, so only answer a connection once it has sent something
$waiting = New-Object Collections.ArrayList
try {
  while ($true) {
    while ($listener.Pending()) { [void]$waiting.Add(@{ C = $listener.AcceptTcpClient(); At = [DateTime]::Now }) }
    $busy = $false
    foreach ($w in @($waiting)) {
      if ($w.C.Available -gt 0) { [void]$waiting.Remove($w); Handle $w.C; $busy = $true }
      elseif (([DateTime]::Now - $w.At).TotalSeconds -gt 30 -or -not $w.C.Connected) { [void]$waiting.Remove($w); $w.C.Close() }
    }
    if (-not $busy) { Start-Sleep -Milliseconds 5 }
  }
} finally { $listener.Stop() }
