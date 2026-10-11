param([int]$Port = 4173, [switch]$Rebuild)
$ErrorActionPreference = 'Stop'
if ($Port -lt 1024 -or $Port -gt 65535) { throw 'Port must be between 1024 and 65535' }
$projectDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location -LiteralPath $projectDirectory
try {
    if ($Rebuild -or -not (Test-Path -LiteralPath (Join-Path $projectDirectory 'dist\index.html'))) {
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
    }
    Write-Host "XCTrack Screen Designer: http://127.0.0.1:$Port/"
    Write-Host 'Keep this console open; Ctrl+C stops the local server.'
    & npm.cmd run preview -- --host 127.0.0.1 --port $Port
    if ($LASTEXITCODE -ne 0) { throw 'Local server stopped with an error' }
} finally {
    Pop-Location
}
