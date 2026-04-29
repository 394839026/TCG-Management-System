$body = @{email='admin@tcg.com';password='admin123456'} | ConvertTo-Json
$response = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method Post -Body $body -ContentType 'application/json'
$token = $response.data.token
$headers = @{Authorization="Bearer $token"}

Write-Host "`n=== 1. 测试店铺创建 ===`n" -ForegroundColor Green
$shopData = @{
    name = "卡牌天堂2"
    description = "专业的卡牌交易和收藏"
    location = @{ address = "上海市浦东新区" }
} | ConvertTo-Json -Depth 3
try {
    $result = Invoke-RestMethod -Uri 'http://localhost:3000/api/shops' -Method Post -Body $shopData -ContentType 'application/json' -Headers $headers
    Write-Host "店铺创建成功!`n" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 5
} catch {
    Write-Host "店铺创建失败:" -ForegroundColor Red
    Write-Host $_ -ForegroundColor Red
}

Write-Host "`n`n=== 2. 测试战队创建 ===`n" -ForegroundColor Green
$teamData = @{
    name = "龙之战队2"
    description = "最强卡牌战队"
} | ConvertTo-Json -Depth 3
try {
    $result = Invoke-RestMethod -Uri 'http://localhost:3000/api/teams' -Method Post -Body $teamData -ContentType 'application/json' -Headers $headers
    Write-Host "战队创建成功!`n" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 5
} catch {
    Write-Host "战队创建失败:" -ForegroundColor Red
    Write-Host $_ -ForegroundColor Red
}
