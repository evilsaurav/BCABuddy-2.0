param(
  [string]$HostAddress = "0.0.0.0",
  [int]$Port = 8000
)

$pythonCandidates = @(
  "C:\Users\imstu\AppData\Local\Programs\Python\Python313\python.exe",
  "C:\Users\imstu\AppData\Local\Python\pythoncore-3.14-64\python.exe",
  (Join-Path $PSScriptRoot "venv\Scripts\python.exe"),
  (Join-Path $PSScriptRoot ".venv\Scripts\python.exe")
)

$python = $pythonCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $python) {
  Write-Error "No usable Python interpreter found. Install Python or repair the backend virtual environment."
  exit 1
}

$ipv4Addresses = @()
try {
  $ipv4Addresses = (ipconfig | Select-String -Pattern 'IPv4').ForEach({
    ($_ -split ':')[-1].Trim()
  }) | Where-Object { $_ -and $_ -ne '127.0.0.1' } | Select-Object -Unique
} catch {
  $ipv4Addresses = @()
}

Write-Host "Starting BCABuddy backend on http://$HostAddress`:$Port using $python"
Write-Host "Local health: http://127.0.0.1:$Port/health"
Write-Host "Local discovery: http://127.0.0.1:$Port/discovery"
foreach ($ip in $ipv4Addresses) {
  Write-Host "LAN health: http://$ip`:$Port/health"
  Write-Host "LAN discovery: http://$ip`:$Port/discovery"
}
Set-Location $PSScriptRoot
& $python -m uvicorn main:app --host $HostAddress --port $Port
