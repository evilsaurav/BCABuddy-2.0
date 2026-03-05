param(
  [int]$BackendPort = 8000,
  [int]$FrontendPort = 5173,
  [string]$BindHost = "127.0.0.1",
  [switch]$InstallDeps,
  [switch]$Reload,
  [switch]$VerboseHealth,
  [int]$StartupTimeoutSec = 90,
  [string]$LogDir = $null
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$VenvDir = Join-Path $BackendDir ".venv"

if (-not $Reload.IsPresent) {
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

function Test-RequiredCommand($Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Missing required command: $Name. Install it and retry."
  }
}

function Resolve-PythonLauncher {
  $pyCmd = Get-Command "python" -ErrorAction SilentlyContinue
  if ($pyCmd -and $pyCmd.Source) {
    return [ordered]@{ Command = $pyCmd.Source; PrefixArgs = @() }
  }

  $pyLauncher = Get-Command "py" -ErrorAction SilentlyContinue
  if ($pyLauncher -and $pyLauncher.Source) {
    return [ordered]@{ Command = $pyLauncher.Source; PrefixArgs = @("-3") }
  }

  throw "Missing Python launcher. Install Python and ensure either 'python' or 'py' is available in PATH."
}

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

function Get-ListeningPids([int]$Port) {
  $pidSet = New-Object 'System.Collections.Generic.HashSet[int]'

  try {
    $lines = netstat -ano -p tcp | Select-String ":$Port\s+LISTENING\s+(\d+)"
    foreach ($line in $lines) {
      $pidVal = 0
      if ([int]::TryParse($line.Matches[0].Groups[1].Value, [ref]$pidVal) -and $pidVal -gt 0) {
        [void]$pidSet.Add($pidVal)
      }
    }
  } catch {
    # ignore
  }

  return @($pidSet)
}

function Invoke-WebRequestCompat([string]$Url, [int]$TimeoutSec = 5) {
  $major = $PSVersionTable.PSVersion.Major
  if ($major -ge 6) {
    return Invoke-WebRequest -TimeoutSec $TimeoutSec -Uri $Url
  }
  return Invoke-WebRequest -UseBasicParsing -TimeoutSec $TimeoutSec -Uri $Url
}

function Wait-HttpOk([string]$Url, [int]$TimeoutSec, [scriptblock]$Validator = $null) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequestCompat -TimeoutSec 5 -Url $Url
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) {
        $isValid = ($null -eq $Validator -or (& $Validator $resp))
        if ($isValid) {
          return $resp.StatusCode
        }

        if ($VerboseHealth.IsPresent) {
          $content = [string]($resp.Content)
          if ($content.Length -gt 400) {
            $content = $content.Substring(0, 400) + "..."
          }
          Write-Host "[BCABuddy][Health] Validator rejected response from $Url" -ForegroundColor Yellow
          Write-Host "[BCABuddy][Health] HTTP $($resp.StatusCode), body preview: $content" -ForegroundColor DarkYellow
        }
      } elseif ($VerboseHealth.IsPresent) {
        Write-Host "[BCABuddy][Health] Non-success status from ${Url}: HTTP $($resp.StatusCode)" -ForegroundColor DarkYellow
      }
    } catch {
      if ($VerboseHealth.IsPresent) {
        Write-Host "[BCABuddy][Health] Probe error for ${Url}: $($_.Exception.Message)" -ForegroundColor DarkYellow
      }
      # keep waiting
    }
    Start-Sleep -Milliseconds 400
  }
  return $null
}

function Get-FileTailIfExists([string]$Path, [int]$Lines = 120) {
  if (Test-Path -LiteralPath $Path) {
    Write-Host "--- Tail: $Path (last $Lines lines) ---" -ForegroundColor Yellow
    Get-Content -LiteralPath $Path -Tail $Lines -ErrorAction SilentlyContinue
  }
}

function Stop-ProcessesByPort([int]$Port, [string]$Label) {
  $pids = Get-ListeningPids -Port $Port
  if (-not $pids -or $pids.Count -eq 0) {
    return @()
  }

  Write-Host "[BCABuddy] Found process(es) on $Label port ${Port}: $($pids -join ', '). Stopping..." -ForegroundColor Yellow
  $stopped = @()
  foreach ($procId in $pids) {
    try {
      Stop-Process -Id $procId -Force -ErrorAction Stop
      $stopped += $procId
    } catch {
      Write-Host "[BCABuddy] Stop-Process failed for PID $procId on port ${Port}: $($_.Exception.Message). Trying taskkill..." -ForegroundColor Yellow
      try {
        & taskkill /PID $procId /F /T | Out-Null
        $stopped += $procId
      } catch {
        Write-Host "[BCABuddy] taskkill also failed for PID ${procId}: $($_.Exception.Message)" -ForegroundColor Red
      }
    }
  }

  $deadline = (Get-Date).AddSeconds(15)
  while ((Get-Date) -lt $deadline) {
    $stillThere = Get-ListeningPids -Port $Port
    if (-not $stillThere -or $stillThere.Count -eq 0) {
      break
    }
    Start-Sleep -Milliseconds 300
  }

  $remaining = Get-ListeningPids -Port $Port
  if ($remaining -and $remaining.Count -gt 0) {
    foreach ($rem in $remaining) {
      try {
        $p = Get-Process -Id $rem -ErrorAction SilentlyContinue
        if ($p) {
          Write-Host "[BCABuddy] Remaining PID $rem -> $($p.ProcessName)" -ForegroundColor Yellow
        }
      } catch {
        # ignore
      }
    }
    throw "Port $Port is still occupied after stop attempt. Remaining PID(s): $($remaining -join ', ')."
  }

  return $stopped
}

function Start-BackgroundProcess {
  param(
    [string]$FilePath,
    [string]$WorkingDirectory,
    [string[]]$ArgumentList,
    [string]$StdOut,
    [string]$StdErr,
    [string]$Name
  )

  Remove-Item -ErrorAction SilentlyContinue -LiteralPath $StdOut, $StdErr
  $proc = Start-Process -FilePath $FilePath -WorkingDirectory $WorkingDirectory -ArgumentList $ArgumentList -RedirectStandardOutput $StdOut -RedirectStandardError $StdErr -PassThru
  Start-Sleep -Milliseconds 500

  if ($proc.HasExited) {
    Get-FileTailIfExists -Path $StdErr
    Get-FileTailIfExists -Path $StdOut
    throw "$Name exited immediately with code $($proc.ExitCode)."
  }

  return $proc
}

function Stop-StartedProcesses([System.Collections.ArrayList]$Processes) {
  if (-not $Processes -or $Processes.Count -eq 0) { return }
  foreach ($proc in @($Processes | Sort-Object -Descending)) {
    if ($null -eq $proc) { continue }
    try {
      if (-not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
      }
    } catch {
      # best effort cleanup
    }
  }
}

function Save-PidFile([string]$Status, $BackendProc, $FrontendProc, [int[]]$KilledBackend, [int[]]$KilledFrontend) {
  $payload = [ordered]@{
    started_at = (Get-Date).ToString("o")
    status = $Status
    bind_host = $BindHost
    backend_port = $BackendPort
    frontend_port = $FrontendPort
    backend_pid = if ($BackendProc) { $BackendProc.Id } else { $null }
    frontend_pid = if ($FrontendProc) { $FrontendProc.Id } else { $null }
    killed_backend_pids = @($KilledBackend)
    killed_frontend_pids = @($KilledFrontend)
    logs = [ordered]@{
      backend_out = $BackendOutLog
      backend_err = $BackendErrLog
      frontend_out = $FrontendOutLog
      frontend_err = $FrontendErrLog
    }
  }

  $payload | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $PidFile -Encoding UTF8
}

function Test-BackendHealthPayload($Response) {
  try {
    $obj = $Response.Content | ConvertFrom-Json -ErrorAction Stop
    return ($obj.status -eq "ok")
  } catch {
    return $false
  }
}

function Test-FrontendPayload($Response) {
  $content = [string]($Response.Content)
  if (-not $content) { return $false }
  return ($content -match "<html|vite|react")
}

$startedProcesses = New-Object System.Collections.ArrayList
$killedBackendPids = @()
$killedFrontendPids = @()
$backendProc = $null
$frontendProc = $null

try {
  Test-RequiredCommand "npm"
  $PythonLauncher = Resolve-PythonLauncher

  if (-not (Test-Path $VenvDir)) {
    Write-Host "[BCABuddy] Creating backend venv (.venv)..."
    Push-Location $BackendDir
    try {
      & $PythonLauncher.Command @($PythonLauncher.PrefixArgs + @("-m", "venv", ".venv"))
    } finally {
      Pop-Location
    }
    $InstallDeps = $true
  }

  $VenvPython = Join-Path $VenvDir "Scripts\python.exe"
  if (-not (Test-Path $VenvPython)) {
    throw "Virtual environment python not found at $VenvPython"
  }

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

  $killedBackendPids = Stop-ProcessesByPort -Port $BackendPort -Label "backend"
  $killedFrontendPids = Stop-ProcessesByPort -Port $FrontendPort -Label "frontend"

  Write-Host "[BCABuddy] Starting backend on http://${BindHost}:$BackendPort ..." -ForegroundColor Cyan
  $backendArgs = @("-m", "uvicorn", "main:app")
  if ($Reload) { $backendArgs += "--reload" }
  $backendArgs += @("--host", $BindHost, "--port", "$BackendPort")

  $backendProc = Start-BackgroundProcess -FilePath $VenvPython -WorkingDirectory $BackendDir -ArgumentList $backendArgs -StdOut $BackendOutLog -StdErr $BackendErrLog -Name "Backend"
  [void]$startedProcesses.Add($backendProc)

  Write-Host "[BCABuddy] Waiting for backend /health..." -ForegroundColor Gray
  $backendStatus = Wait-HttpOk -Url "http://${BindHost}:$BackendPort/health" -TimeoutSec $StartupTimeoutSec -Validator { param($resp) Test-BackendHealthPayload $resp }
  if (-not $backendStatus) {
    Get-FileTailIfExists -Path $BackendErrLog
    Get-FileTailIfExists -Path $BackendOutLog
    throw "Backend health validation failed."
  }
  Write-Host "[BCABuddy] Backend OK (HTTP $backendStatus)." -ForegroundColor Green

  Write-Host "[BCABuddy] Starting frontend on http://${BindHost}:$FrontendPort ..." -ForegroundColor Cyan
  $npmPath = Resolve-NpmPath
  $frontendArgs = @("run", "dev", "--", "--host", $BindHost, "--port", "$FrontendPort", "--strictPort")
  $frontendProc = Start-BackgroundProcess -FilePath $npmPath -WorkingDirectory $FrontendDir -ArgumentList $frontendArgs -StdOut $FrontendOutLog -StdErr $FrontendErrLog -Name "Frontend"
  [void]$startedProcesses.Add($frontendProc)

  Write-Host "[BCABuddy] Waiting for frontend..." -ForegroundColor Gray
  $frontendStatus = Wait-HttpOk -Url "http://${BindHost}:$FrontendPort/" -TimeoutSec $StartupTimeoutSec -Validator { param($resp) Test-FrontendPayload $resp }
  if (-not $frontendStatus) {
    Get-FileTailIfExists -Path $FrontendErrLog
    Get-FileTailIfExists -Path $FrontendOutLog
    throw "Frontend health validation failed."
  }

  Save-PidFile -Status "running" -BackendProc $backendProc -FrontendProc $frontendProc -KilledBackend $killedBackendPids -KilledFrontend $killedFrontendPids

  Write-Host "[BCABuddy] Frontend reachable (HTTP $frontendStatus)." -ForegroundColor Green
  Write-Host "[BCABuddy] Logs: $LogDir" -ForegroundColor Gray

  Start-Process "http://${BindHost}:$FrontendPort" | Out-Null
  Write-Host "[BCABuddy] Opened browser to the frontend." -ForegroundColor Gray
}
catch {
  Write-Host "[BCABuddy] Startup failed: $($_.Exception.Message)" -ForegroundColor Red
  Stop-StartedProcesses -Processes $startedProcesses
  Save-PidFile -Status "failed" -BackendProc $null -FrontendProc $null -KilledBackend $killedBackendPids -KilledFrontend $killedFrontendPids
  throw
}
