# 在家裡電腦啟動實力估算分析服務 + 免費 Cloudflare Tunnel
# 用法：在專案根目錄執行  powershell -ExecutionPolicy Bypass -File scripts/start-home-skill-analyzer.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Svc = Join-Path $Root "services\skill-analyzer"
$VenvPython = Join-Path $Svc ".venv\Scripts\python.exe"
$VenvUvicorn = Join-Path $Svc ".venv\Scripts\uvicorn.exe"
$UrlFile = Join-Path $Root "storage\skill-tunnel-url.txt"

function Find-Cloudflared {
  $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $paths = @(
    (Join-Path $Root "tools\cloudflared.exe"),
    "$env:ProgramFiles\cloudflared\cloudflared.exe",
    "$env:LOCALAPPDATA\cloudflared\cloudflared.exe"
  )
  foreach ($p in $paths) {
    if (Test-Path $p) { return $p }
  }
  return $null
}

if (-not (Test-Path $VenvUvicorn)) {
  Write-Host "尚未安裝分析環境，請先執行 scripts/setup-home-skill-analyzer.ps1" -ForegroundColor Yellow
  exit 1
}

$cloudflared = Find-Cloudflared
if (-not $cloudflared) {
  Write-Host "找不到 cloudflared。請先執行 scripts/setup-home-skill-analyzer.ps1" -ForegroundColor Yellow
  exit 1
}

New-Item -ItemType Directory -Force -Path (Join-Path $Root "storage") | Out-Null

Write-Host "啟動分析 API（http://127.0.0.1:8090）..." -ForegroundColor Cyan
$api = Start-Process -FilePath $VenvUvicorn -ArgumentList @(
  "skill_analyzer.main:app",
  "--host", "127.0.0.1",
  "--port", "8090"
) -WorkingDirectory $Svc -PassThru -WindowStyle Minimized

Start-Sleep -Seconds 3
if ($api.HasExited) {
  Write-Host "分析 API 啟動失敗，請看最小化視窗或重新執行 setup 腳本。" -ForegroundColor Red
  exit 1
}

$log = Join-Path $env:TEMP "pickleball-cloudflared.log"
if (Test-Path $log) { Remove-Item $log -Force }
Write-Host "啟動免費 Tunnel（第一次可能要等 20–40 秒）..." -ForegroundColor Cyan
$tunnel = Start-Process -FilePath $cloudflared -ArgumentList @(
  "tunnel", "--no-autoupdate", "--url", "http://127.0.0.1:8090"
) -RedirectStandardError $log -RedirectStandardOutput $log -PassThru -WindowStyle Hidden

$publicUrl = $null
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 2
  if (Test-Path $log) {
    $text = Get-Content $log -Raw -ErrorAction SilentlyContinue
    if ($text -match "https://[a-z0-9-]+\.trycloudflare\.com") {
      $publicUrl = $Matches[0]
      break
    }
  }
  if ($tunnel.HasExited) { break }
}

if (-not $publicUrl) {
  Write-Host "Tunnel 還沒拿到網址。cloudflared 日誌：" -ForegroundColor Yellow
  if (Test-Path $log) { Get-Content $log -Tail 40 }
  Write-Host "`n請保持此視窗，不要關閉。結束時按 Ctrl+C 無效，請關掉這個視窗並結束 cloudflared / uvicorn 行程。" -ForegroundColor Yellow
} else {
  Set-Content -Path $UrlFile -Value $publicUrl -Encoding utf8
  Write-Host ""
  Write-Host "========================================" -ForegroundColor Green
  Write-Host " Tunnel 網址（貼到 Vercel SKILL_ANALYZER_URL）：" -ForegroundColor Green
  Write-Host " $publicUrl" -ForegroundColor Green
  Write-Host "========================================" -ForegroundColor Green
  Write-Host "Vercel 的 SKILL_ANALYZER_SECRET 必須與本機 .env 相同。"
  Write-Host "電腦要開著、這個視窗不要關，正式站才能分析影片。"
  Write-Host "每次重開 Tunnel，網址可能會變，變了就要改 Vercel 再 Redeploy。"
}

Write-Host ""
Write-Host "按 Enter 會停止分析服務與 Tunnel。"
[void][System.Console]::ReadLine()

if ($tunnel -and -not $tunnel.HasExited) { Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue }
if ($api -and -not $api.HasExited) { Stop-Process -Id $api.Id -Force -ErrorAction SilentlyContinue }
Write-Host "已停止。"
