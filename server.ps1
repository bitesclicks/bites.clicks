# Bites & Clicks - Local Development Web Server
# Powered by Windows PowerShell & .NET HttpListener (No external dependencies required)

param(
    [int]$Port = 8080
)

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " Bites & Clicks Web Server Running!" -ForegroundColor Yellow
    Write-Host " URL: $prefix" -ForegroundColor Cyan
    Write-Host " Serving files from: $((Get-Location).Path)" -ForegroundColor Gray
    Write-Host " Press Ctrl+C in this terminal window to stop the server." -ForegroundColor DarkGray
    Write-Host "==========================================================" -ForegroundColor Green
} catch {
    Write-Warning "Port $Port is in use or requires elevation. Trying port $($Port + 1)..."
    $Port = $Port + 1
    $prefix = "http://localhost:$Port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($prefix)
    $listener.Start()
    Write-Host "Server running at $prefix" -ForegroundColor Cyan
}

$basePath = (Get-Location).Path

# Open the site in the default browser
Start-Process $prefix

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Enable CORS
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.OutputStream.Close()
            continue
        }

        $rawPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($rawPath)) {
            $rawPath = "index.html"
        }

        # URL Decode
        $decodedPath = [System.Uri]::UnescapeDataString($rawPath)
        $filePath = Join-Path $basePath $decodedPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".png"  { $response.ContentType = "image/png" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".jpeg" { $response.ContentType = "image/jpeg" }
                ".webp" { $response.ContentType = "image/webp" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                ".json" { $response.ContentType = "application/json; charset=utf-8" }
                default { $response.ContentType = "application/octet-stream" }
            }

            # Cache-control: enable caching for split images for ultra smooth scrubbing
            if ($filePath -like "*split*") {
                $response.AddHeader("Cache-Control", "public, max-age=86400")
            } else {
                $response.AddHeader("Cache-Control", "no-cache")
            }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
        }

        $response.OutputStream.Close()
    } catch {
        # Continue loop on connection reset or client disconnect
    }
}
