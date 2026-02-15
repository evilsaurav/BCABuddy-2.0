# BCABuddy Comprehensive Testing Script
# Tests all 17 API endpoints and critical functionality

# PSScriptAnalyzerSettings
@{
    Rules = @{
        PSUseDeclaredVarsMoreThanAssignments = @{
            Enable = $false
        }
    }
}

$ErrorActionPreference = "Continue"
$baseUrl = "http://127.0.0.1:8000"
$testResults = @()

function Test-Endpoint {
    param($name, $scriptBlock)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Testing: $name" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    
    try {
        $result = & $scriptBlock
        Write-Host "✅ PASSED: $name" -ForegroundColor Green
        $script:testResults += @{ Name = $name; Status = "PASSED"; Result = $result }
        return $result
    }
    catch {
        Write-Host "❌ FAILED: $name" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:testResults += @{ Name = $name; Status = "FAILED"; Error = $_.Exception.Message }
        return $null
    }
}

# Test 1: Backend Health
Test-Endpoint "1. Backend Health Check" {
    $response = Invoke-RestMethod -Uri "$baseUrl/health"
    Write-Host "  Status: $($response.status)" -ForegroundColor Cyan
    Write-Host "  AI Service: $($response.ai_service)" -ForegroundColor Cyan
    Write-Host "  RAG Service: $($response.rag_service)" -ForegroundColor Cyan
    Write-Host "  OCR Service: $($response.ocr_service)" -ForegroundColor Cyan
    return $response
}

# Test 2: User Signup
if (-not (Test-Endpoint "2. User Signup" {
    $username = "testuser_comprehensive_$(Get-Date -Format 'HHmmss')"
    $signupData = @{
        username = $username
        password = "TestPass123!@#"
        display_name = "Comprehensive Test User"
        gender = "Male"
    } | ConvertTo-Json
    })) {
    Write-Host "  Display Name: $($response.display_name)" -ForegroundColor Cyan
    
    # Save for later tests
    
    return $response
}

if (-not $signupResult) {
    Write-Host "Signup failed. Stopping tests." -ForegroundColor Red
    return
}

Write-Host "  Signup result stored: $($signupResult.username)" -ForegroundColor DarkGray

# Test 3: User Login
if (-not (Test-Endpoint "3. User Login (JWT Authentication)" {
    $loginData = "username=$($script:testUsername)&password=$($script:testPassword)"
    $response = Invoke-RestMethod -Uri "$baseUrl/login" -Method POST -Body $loginData -ContentType "application/x-www-form-urlencoded"
    })) {
    
    # Save token for authenticated requests
    $script:authToken = $response.access_token
    return $response
}

if (-not $loginResult) {
    Write-Host "Login failed. Stopping tests." -ForegroundColor Red
    return
}

Write-Host "  Login result stored: $($loginResult.token_type)" -ForegroundColor DarkGray

# Test 4: Get Profile
Test-Endpoint "4. Get User Profile" {
    $response = Invoke-RestMethod -Uri "$baseUrl/profile" -Headers $script:authHeaders
    Write-Host "  Username: $($response.username)" -ForegroundColor Cyan
    Write-Host "  Display Name: $($response.display_name)" -ForegroundColor Cyan
    return $response
}

# Test 5: Update Profile
Test-Endpoint "5. Update User Profile" {
    $profileData = @{
        display_name = "Updated Test User"
        bio = "This is a comprehensive test bio for BCABuddy"
        email = "test@bcabuddy.com"
        mobile_number = "9876543210"
        college = "Test College"
        enrollment_id = "BCA2024001"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/profile" -Method PUT -Headers $script:authHeaders -Body $profileData -ContentType "application/json"
    Write-Host "  Updated Display Name: $($response.display_name)" -ForegroundColor Cyan
    Write-Host "  Email: $($response.email)" -ForegroundColor Cyan
    return $response
}

# Test 6: Get Sessions
Test-Endpoint "6. Get Chat Sessions" {
    $response = Invoke-RestMethod -Uri "$baseUrl/sessions" -Headers $script:authHeaders
    Write-Host "  Total Sessions: $(if ($response) { $response.Count } else { 0 })" -ForegroundColor Cyan
    return $response
}

# Test 7: Send Chat Message (Fast Mode)
Test-Endpoint "7. Chat - Fast Mode" {
    $chatData = @{
        message = "What is polymorphism in Java?"
        mode = "normal"
        selected_subject = "MCS-024"
        response_mode = "fast"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/chat" -Method POST -Headers $script:authHeaders -Body $chatData -ContentType "application/json"
    
    Write-Host "  Answer Length: $($response.answer.Length) chars" -ForegroundColor Cyan
    Write-Host "  Suggestions Count: $($response.next_suggestions.Count)" -ForegroundColor Cyan
    Write-Host "  First 100 chars: $($response.answer.Substring(0, [Math]::Min(100, $response.answer.Length)))..." -ForegroundColor Gray
    
    return $response
}

# Test 8: Send Chat Message (Thinking Mode)
Test-Endpoint "8. Chat - Thinking Mode" {
    $chatData = @{
        message = "Explain inheritance with example"
        mode = "normal"
        selected_subject = "MCS-024"
        response_mode = "thinking"
    } | ConvertTo-Json
    
    Write-Host "  Sending message in Thinking mode (should have 3s delay)..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$baseUrl/chat" -Method POST -Headers $script:authHeaders -Body $chatData -ContentType "application/json"
    
    Write-Host "  Answer Length: $($response.answer.Length) chars" -ForegroundColor Cyan
    Write-Host "  Suggestions: $($response.next_suggestions -join ', ')" -ForegroundColor Cyan
    
    return $response
}

# Test 9: Chat History
Test-Endpoint "9. Get Chat History" {
    $response = Invoke-RestMethod -Uri "$baseUrl/history" -Headers $script:authHeaders
    Write-Host "  Total Messages: $(if ($response) { $response.Count } else { 0 })" -ForegroundColor Cyan
    
    if ($response -and $response.Count -gt 0) {
        Write-Host "  Latest Message: $($response[-1].text.Substring(0, [Math]::Min(80, $response[-1].text.Length)))..." -ForegroundColor Gray
    }
    
    return $response
}

# Test 10: Dashboard Stats
Test-Endpoint "10. Dashboard Statistics" {
    $response = Invoke-RestMethod -Uri "$baseUrl/dashboard-stats" -Headers $script:authHeaders
    Write-Host "  Total Chats: $($response.total_chats)" -ForegroundColor Cyan
    Write-Host "  Total Sessions: $($response.total_sessions)" -ForegroundColor Cyan
    Write-Host "  Weeks Active: $($response.weeks_active)" -ForegroundColor Cyan
    return $response
}

# Test 11: Quiz Generation
Test-Endpoint "11. Generate Quiz (15 MCQs)" {
    $quizData = @{
        semester = 4
        subject = "MCS-024"
    } | ConvertTo-Json
    
    Write-Host "  Generating quiz (may take 10-15 seconds)..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$baseUrl/generate-quiz" -Method POST -Headers $script:authHeaders -Body $quizData -ContentType "application/json" -TimeoutSec 30
    
    Write-Host "  Questions Generated: $($response.questions.Count)" -ForegroundColor Cyan
    
    if ($response.questions -and $response.questions.Count -gt 0) {
        Write-Host "  Sample Question: $($response.questions[0].question)" -ForegroundColor Gray
        Write-Host "  Options: $($response.questions[0].options -join ', ')" -ForegroundColor Gray
    }
    
    return $response
}

# Test 12: Study Tool - Assignments
Test-Endpoint "12. Study Tool - Assignments" {
    $chatData = @{
        message = "Give me assignment questions for Data Structures"
        mode = "normal"
        selected_subject = "MCS-012"
        active_tool = "Assignments"
        response_mode = "fast"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/chat" -Method POST -Headers $script:authHeaders -Body $chatData -ContentType "application/json"
    
    Write-Host "  Tool Activated: Assignments" -ForegroundColor Cyan
    Write-Host "  Response Length: $($response.answer.Length) chars" -ForegroundColor Cyan
    
    return $response
}

# Test 13: Persona Trigger - Saurav Kumar
Test-Endpoint "13. Persona Detection - Saurav Kumar" {
    $chatData = @{
        message = "Who is Saurav Kumar?"
        mode = "normal"
        response_mode = "fast"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/chat" -Method POST -Headers $script:authHeaders -Body $chatData -ContentType "application/json"
    
    Write-Host "  Checking for persona trigger..." -ForegroundColor Yellow
    $pattern = "Supreme Architect|Saurav|creator"
    if ($response.answer -match $pattern) {
        Write-Host "  Persona detected in response" -ForegroundColor Green
    }
    Write-Host "  Response preview: $($response.answer.Substring(0, [Math]::Min(150, $response.answer.Length)))..." -ForegroundColor Gray
    
    return $response
}

# Test 14: Password Change
Test-Endpoint "14. Change Password" {
    $passwordData = @{
        old_password = $script:testPassword
        new_password = "NewTestPass456!@#"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/profile/change-password" -Method POST -Headers $script:authHeaders -Body $passwordData -ContentType "application/json"
    
    Write-Host "  Password changed successfully" -ForegroundColor Cyan
    
    # Update test password
    $script:testPassword = "NewTestPass456!@#"
    
    return $response
}

# Test 15: Session Management (Create/Rename)
Test-Endpoint "15. Create and Rename Session" {
    # Create a new session by sending a message
    $chatData = @{
        message = "Test session creation"
        mode = "normal"
        response_mode = "fast"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$baseUrl/chat" -Method POST -Headers $script:authHeaders -Body $chatData -ContentType "application/json" | Out-Null
    
    # Get all sessions to find the latest one
    $sessions = Invoke-RestMethod -Uri "$baseUrl/sessions" -Headers $script:authHeaders
    $latestSession = $sessions | Sort-Object -Property created_at -Descending | Select-Object -First 1
    
    Write-Host "  Created Session ID: $($latestSession.id)" -ForegroundColor Cyan
    
    # Rename the session
    $renameData = @{
        title = "Renamed Test Session"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/sessions/$($latestSession.id)" -Method PUT -Headers $script:authHeaders -Body $renameData -ContentType "application/json"
    
    Write-Host "  Renamed Session Title: $($response.title)" -ForegroundColor Cyan
    
    return $response
}

# Test 16: Delete Session
Test-Endpoint "16. Delete Session" {
    # Get all sessions
    $sessions = Invoke-RestMethod -Uri "$baseUrl/sessions" -Headers $script:authHeaders
    
    if ($sessions -and $sessions.Count -gt 1) {
        $sessionToDelete = $sessions[0]
        
        $response = Invoke-RestMethod -Uri "$baseUrl/sessions/$($sessionToDelete.id)" -Method DELETE -Headers $script:authHeaders
        
        Write-Host "  Deleted Session ID: $($sessionToDelete.id)" -ForegroundColor Cyan
        Write-Host "  Message: $($response.message)" -ForegroundColor Cyan
        
        return $response
    }
    else {
        Write-Host "  Skipping: No sessions to delete" -ForegroundColor Yellow
        return @{ message = "No sessions to delete" }
    }
}

# Summary Report
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "           TEST SUMMARY REPORT          " -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

$passed = ($testResults | Where-Object { $_.Status -eq "PASSED" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAILED" }).Count
$total = $testResults.Count

Write-Host "`nTotal Tests: $total" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Success Rate: $([math]::Round(($passed/$total)*100, 2))%" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Yellow" })

Write-Host "`n========================================" -ForegroundColor Magenta

if ($failed -gt 0) {
    Write-Host "`nFailed Tests:" -ForegroundColor Red
    $testResults | Where-Object { $_.Status -eq "FAILED" } | ForEach-Object {
        Write-Host "  ❌ $($_.Name)" -ForegroundColor Red
        Write-Host "     Error: $($_.Error)" -ForegroundColor Gray
    }
}

Write-Host "`n✅ Comprehensive testing completed!" -ForegroundColor Green
Write-Host "Frontend URL: http://127.0.0.1:5173" -ForegroundColor Cyan
Write-Host "Backend URL: http://127.0.0.1:8000" -ForegroundColor Cyan
