$body = @{ Email = "islam@test.com"; Password = "Password123!" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net/api/auth/login" -Method Post -Body $body -ContentType "application/json"
$token = $response.accessToken
$headers = @{ Authorization = "Bearer $token" }
$project = Invoke-RestMethod -Uri "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net/api/projects/me" -Method Get -Headers $headers
$project | ConvertTo-Json
