# Serve the site locally without Python, using what every Windows PC already has.
#
#     powershell -ExecutionPolicy Bypass -File tools\serve.ps1     # http://127.0.0.1:5173/
#
# Same behaviour as serve.py: the browser never keeps old copies, and videos are sent in pieces
# (HTTP range requests). It answers one request at a time, so each video piece is kept small.

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$piece = 2MB
$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.png' = 'image/png'
  '.gif' = 'image/gif'; '.svg' = 'image/svg+xml'; '.webp' = 'image/webp'; '.ico' = 'image/x-icon'
  '.mp4' = 'video/mp4'; '.webm' = 'video/webm'; '.mp3' = 'audio/mpeg'; '.wav' = 'audio/wav'
  '.pdf' = 'application/pdf'; '.woff2' = 'font/woff2'; '.woff' = 'font/woff'; '.ttf' = 'font/ttf'
}

$http = New-Object Net.HttpListener
$http.Prefixes.Add('http://127.0.0.1:5173/')
$http.Start()
Write-Host 'Site running at http://127.0.0.1:5173/  (keep this window open)'

while ($http.IsListening) {
  $ctx = $http.GetContext()
  $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
    $res.Headers['Cache-Control'] = 'no-store'
    $res.Headers['Accept-Ranges'] = 'bytes'
    if (-not $path.StartsWith($root, 'OrdinalIgnoreCase') -or -not [IO.File]::Exists($path)) {
      $res.StatusCode = 404
      continue
    }
    $type = $types[[IO.Path]::GetExtension($path).ToLower()]
    $res.ContentType = if ($type) { $type } else { 'application/octet-stream' }
    $f = [IO.File]::OpenRead($path)
    try {
      $size = $f.Length
      $start = 0; $end = $size - 1
      $range = $ctx.Request.Headers['Range']
      if ($range -match '^bytes=(\d*)-(\d*)$') {
        if ($Matches[1]) { $start = [long]$Matches[1]; if ($Matches[2]) { $end = [long]$Matches[2] } }
        elseif ($Matches[2]) { $start = [Math]::Max(0, $size - [long]$Matches[2]) }
        $end = [Math]::Min([Math]::Min($end, $size - 1), $start + $piece - 1)
        if ($start -ge $size) { $res.StatusCode = 416; continue }
        $res.StatusCode = 206
        $res.Headers['Content-Range'] = "bytes $start-$end/$size"
      }
      $res.ContentLength64 = $end - $start + 1
      $f.Position = $start
      $buf = New-Object byte[] 262144
      $left = $end - $start + 1
      while ($left -gt 0) {
        $n = $f.Read($buf, 0, [int][Math]::Min($buf.Length, $left))
        if ($n -le 0) { break }
        $res.OutputStream.Write($buf, 0, $n)
        $left -= $n
      }
    } finally { $f.Close() }
  } catch {
    # the browser stopped this piece, which is normal for video
  } finally {
    try { $res.Close() } catch {}
  }
}
