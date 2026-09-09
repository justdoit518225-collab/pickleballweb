# 安裝家裡電腦的實力估算分析環境（Python venv + Cloudflare Tunnel 用戶端）
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Svc = Join-Path $Root "services\skill-analyzer"
$Venv = Join-Path $Svc ".venv"
$Py = Join-Path $Venv "Scripts\python.exe"

Write-Host "建立 Python 虛擬環境..." -ForegroundColor Cyan
if (-not (Test-Path $Py)) {
  python -m venv $Venv
}

Write-Host "安裝 CPU 版 PyTorch 與分析套件（可能要好幾分鐘）..." -ForegroundColor Cyan
& $Py -m pip install --upgrade pip
& $Py -m pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision
& $Py -m pip install -r (Join-Path $Svc "requirements.txt")
& $Py -m pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision

$cf = Get-Command cloudflared -ErrorAction SilentlyContinue
$localCf = Join-Path $Root "tools\cloudflared.exe"
if (-not $cf -and -not (Test-Path $localCf)) {
  Write-Host "下載 cloudflared（免安裝）..." -ForegroundColor Cyan
  New-Item -ItemType Directory -Force -Path (Join-Path $Root "tools") | Out-Null
  $url = "https://github.com/cloudflare/cloudflared/releases/download/2026.8.3/cloudflared-windows-amd64.exe"
  Invoke-WebRequest -Uri $url -OutFile $localCf
}

Write-Host "完成。之後每次要接正式站，執行：" -ForegroundColor Green
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/start-home-skill-analyzer.ps1"
