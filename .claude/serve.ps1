[Console]::Out.Flush()
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:3000/")
$listener.Start()
[Console]::WriteLine("Serving on http://localhost:3000")
[Console]::Out.Flush()

$docroot = "C:\Users\2350468\Desktop\SF_Package"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = $request.Url.LocalPath
    if ($path -eq "/") { $path = "/index.html" }

    $filePath = Join-Path $docroot $path.TrimStart("/")

    # SPA fallback: if file not found, serve index HTML
    if (-not (Test-Path $filePath)) {
        $filePath = Join-Path $docroot "index.html"
    }

    if (Test-Path $filePath) {
        $content = [System.IO.File]::ReadAllBytes($filePath)

        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        switch ($ext) {
            ".html" { $response.ContentType = "text/html; charset=utf-8" }
            ".css"  { $response.ContentType = "text/css" }
            ".js"   { $response.ContentType = "application/javascript" }
            ".png"  { $response.ContentType = "image/png" }
            ".jpg"  { $response.ContentType = "image/jpeg" }
            ".svg"  { $response.ContentType = "image/svg+xml" }
            ".json" { $response.ContentType = "application/json" }
            ".xml"  { $response.ContentType = "application/xml" }
            ".txt"  { $response.ContentType = "text/plain" }
            default { $response.ContentType = "application/octet-stream" }
        }

        # No caching during development
        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
        $response.Headers.Add("Pragma", "no-cache")
        $response.Headers.Add("Expires", "0")

        # Use SendChunked to avoid Content-Length mismatch on large files
        $response.SendChunked = $true
        try {
            $response.OutputStream.Write($content, 0, $content.Length)
        } catch {
            # Ignore write errors (client disconnect, etc.)
        }
    } else {
        $response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
        $response.OutputStream.Write($msg, 0, $msg.Length)
    }

    try { $response.Close() } catch {}
}
