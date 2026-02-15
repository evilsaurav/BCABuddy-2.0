param(
  [int]$BackendPort = 8000,
  [int]$FrontendPort = 5173,
  [string]$BindHost = "127.0.0.1",
  [switch]$InstallDeps,
  [switch]$Reload,
  [int]$StartupTimeoutSec = 90,
  [string]$LogDir = $null
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$VenvDir = Join-Path $BackendDir ".venv"

if (-not $Reload.IsPresent) {
  # Back-compat: default to reload on.
  $Reload = $true
}

if (-not $LogDir) {
  $LogDir = Join-Path $Root "logs"
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$BackendOutLog = Join-Path $LogDir "backend.out.log"
$BackendErrLog = Join-Path $LogDir "backend.err.log"
$FrontendOutLog = Join-Path $LogDir "frontend.out.log"
$FrontendErrLog = Join-Path $LogDir "frontend.err.log"
$PidFile = Join-Path $LogDir "run_app.pids.json"

Write-Host "[BCABuddy] Root: $Root"

function Ensure-Command($Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Missing required command: $Name. Install it and retry."
  }
}

Ensure-Command "python"
Ensure-Command "npm"

function Resolve-NpmPath {
  $npmCmd = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
  if ($npmCmd -and $npmCmd.Source) {
    return $npmCmd.Source
  }
  $npmExe = Get-Command "npm" -ErrorAction SilentlyContinue
  if ($npmExe -and $npmExe.Source) {
    return $npmExe.Source
  }
  throw "Unable to resolve npm executable path."
}

function Test-ListeningPort([string]$TargetHost, [int]$Port) {
  try {
    $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connections) { return $true }
  } catch {
    # ignore
  }
  try {
    return [bool](Test-NetConnection -ComputerName $TargetHost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue)
  } catch {
    return $false
  }
}

function Wait-HttpOk([string]$Url, [int]$TimeoutSec) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 -Uri $Url
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
        return $resp.StatusCode
      }
    } catch {
      Start-Sleep -Milliseconds 400
    }
  }
  return $null
}

function Tail-FileIfExists([string]$Path, [int]$Lines = 120) {
  if (Test-Path -LiteralPath $Path) {
    Write-Host "--- Tail: $Path (last $Lines lines) ---" -ForegroundColor Yellow
    Get-Content -LiteralPath $Path -Tail $Lines -ErrorAction SilentlyContinue
  }
}

# --- Backend venv + deps ---
if (-not (Test-Path $VenvDir)) {
  Write-Host "[BCABuddy] Creating backend venv (.venv)..."
  Push-Location $BackendDir
  try {
    python -m venv .venv
  } finally {
    Pop-Location
  }
  $InstallDeps = $true
}

$VenvPython = Join-Path $VenvDir "Scripts\python.exe"

if ($InstallDeps.IsPresent) {
  Write-Host "[BCABuddy] Installing backend requirements..." -ForegroundColor Cyan
  Push-Location $BackendDir
  try {
    & $VenvPython -m pip install --upgrade pip
    & $VenvPython -m pip install -r requirements.txt
  } finally {
    Pop-Location
  }
} else {
  Write-Host "[BCABuddy] Skipping backend dependency install (use -InstallDeps to force)."
}

# --- Frontend deps ---
if ($InstallDeps.IsPresent -or -not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
  Write-Host "[BCABuddy] Installing frontend dependencies (npm install)..."
  Push-Location $FrontendDir
  try {
    npm install
  } finally {
    Pop-Location
  }
} else {
  Write-Host "[BCABuddy] Skipping frontend dependency install (use -InstallDeps to force)."
}

# --- Start backend + frontend (background) and run health checks ---
$backendAlreadyUp = Test-ListeningPort -TargetHost $BindHost -Port $BackendPort
$frontendAlreadyUp = Test-ListeningPort -TargetHost $BindHost -Port $FrontendPort

$backendProc = $null
$frontendProc = $null

if (-not $backendAlreadyUp) {
  Write-Host "[BCABuddy] Starting backend on http://${BindHost}:$BackendPort ..." -ForegroundColor Cyan
  $backendArgs = @("-m", "uvicorn", "main:app")
  if ($Reload) { $backendArgs += "--reload" }
  $backendArgs += @("--host", $BindHost, "--port", "$BackendPort")

  Remove-Item -ErrorAction SilentlyContinue -LiteralPath $BackendOutLog, $BackendErrLog
  $backendProc = Start-Process -FilePath $VenvPython -WorkingDirectory $BackendDir -ArgumentList $backendArgs -RedirectStandardOutput $BackendOutLog -RedirectStandardError $BackendErrLog -PassThru
} else {
  Write-Host "[BCABuddy] Backend already listening on ${BindHost}:$BackendPort (not starting a new one)." -ForegroundColor DarkYellow
}

if (-not $frontendAlreadyUp) {
  Write-Host "[BCABuddy] Starting frontend on http://${BindHost}:$FrontendPort ..." -ForegroundColor Cyan
  Remove-Item -ErrorAction SilentlyContinue -LiteralPath $FrontendOutLog, $FrontendErrLog

  $npmPath = Resolve-NpmPath
  $frontendProc = Start-Process -FilePath $npmPath -WorkingDirectory $FrontendDir -ArgumentList @("run", "dev", "--", "--host", $BindHost, "--port", "$FrontendPort", "--strictPort") -RedirectStandardOutput $FrontendOutLog -RedirectStandardError $FrontendErrLog -PassThru
} else {
  Write-Host "[BCABuddy] Frontend already listening on ${BindHost}:$FrontendPort (not starting a new one)." -ForegroundColor DarkYellow
}

$pids = [ordered]@{
  started_at = (Get-Date).ToString("o")
  bind_host = $BindHost
  backend_port = $BackendPort
  frontend_port = $FrontendPort
  backend_pid = if ($backendProc) { $backendProc.Id } else { $null }
  frontend_pid = if ($frontendProc) { $frontendProc.Id } else { $null }
}
$pids | ConvertTo-Json | Set-Content -LiteralPath $PidFile -Encoding UTF8

Write-Host "[BCABuddy] Waiting for backend /health..." -ForegroundColor Gray
$backendStatus = Wait-HttpOk -Url "http://${BindHost}:$BackendPort/health" -TimeoutSec $StartupTimeoutSec
if (-not $backendStatus) {
  Write-Host "[BCABuddy] Backend /health check failed, but checking if it's listening..." -ForegroundColor Yellow
  $isListening = Test-ListeningPort -TargetHost $BindHost -Port $BackendPort
  if (-not $isListening) {
    Write-Host "[BCABuddy] Backend is not listening on port $BackendPort." -ForegroundColor Red
    Tail-FileIfExists -Path $BackendErrLog
    Tail-FileIfExists -Path $BackendOutLog
    throw "Backend startup failed. Check logs in: $LogDir"
  }
  Write-Host "[BCABuddy] Backend is listening (skipping health check)." -ForegroundColor Yellow
} else {
  Write-Host "[BCABuddy] Backend OK (HTTP $backendStatus)." -ForegroundColor Green
}

Write-Host "[BCABuddy] Waiting for frontend..." -ForegroundColor Gray
$frontendStatus = Wait-HttpOk -Url "http://${BindHost}:$FrontendPort/" -TimeoutSec $StartupTimeoutSec
if (-not $frontendStatus) {
  Write-Host "[BCABuddy] Frontend did not become reachable within ${StartupTimeoutSec}s." -ForegroundColor Red
  Tail-FileIfExists -Path $FrontendErrLog
  Tail-FileIfExists -Path $FrontendOutLog
  throw "Frontend startup failed. Check logs in: $LogDir"
}

Write-Host "[BCABuddy] Frontend reachable (HTTP $frontendStatus)." -ForegroundColor Green
Write-Host "[BCABuddy] Logs: $LogDir" -ForegroundColor Gray

Start-Process "http://${BindHost}:$FrontendPort" | Out-Null
Write-Host "[BCABuddy] Opened browser to the frontend." -ForegroundColor Gray