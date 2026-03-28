param(
  [string]$BaseUrl = "http://127.0.0.1:8000"
)

$healthUrl = ($BaseUrl.TrimEnd('/')) + "/health"
Invoke-RestMethod -Uri $healthUrl -Method GET | ConvertTo-Json
