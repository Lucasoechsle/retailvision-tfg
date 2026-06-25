# ============================================================
#  RetailVision - Arranque de demo para la defensa
#  Uso:  .\demo.ps1
#  Hace: verifica Supabase, recuerda los pasos, y levanta el server.
# ============================================================

$ErrorActionPreference = "Continue"
$proj = "C:\Users\luki_\Documents\celuque\retail-vision"
Set-Location $proj

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RetailVision - Preparando la demo" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# --- 1. Verificar que Supabase responda ---
Write-Host ""
Write-Host "[1/3] Verificando Supabase..." -ForegroundColor Yellow
$envFile = Join-Path $proj ".env.local"
if (-not (Test-Path $envFile)) {
  Write-Host "  [X] No existe .env.local" -ForegroundColor Red
} else {
  $m = Select-String -Path $envFile -Pattern "NEXT_PUBLIC_SUPABASE_URL=(.*)"
  $url = $m.Matches.Groups[1].Value.Trim()
  $code = & curl.exe -s -o $null -w "%{http_code}" -m 8 "$url/rest/v1/" 2>$null
  if ($code -eq "000" -or [string]::IsNullOrEmpty($code)) {
    Write-Host "  [X] Supabase NO responde. Probablemente esta PAUSADO." -ForegroundColor Red
    Write-Host "      Anda a https://supabase.com/dashboard y reactiva el proyecto (Restore)." -ForegroundColor Red
    Write-Host "      Despues volve a correr este script." -ForegroundColor Red
    Read-Host "`n  Enter para salir"
    exit 1
  } else {
    Write-Host "  [OK] Supabase responde (HTTP $code)" -ForegroundColor Green
  }
}

# --- 2. Recordatorios ---
Write-Host ""
Write-Host "[2/3] Antes de presentar, acordate de:" -ForegroundColor Yellow
Write-Host "  - Refrescar fechas: corre 'refresh_demo_dates.sql' en el SQL Editor de Supabase" -ForegroundColor White
Write-Host "    (deja todos los datos como si fueran de hoy)" -ForegroundColor DarkGray
Write-Host "  - Login:  admin@retailvision.com  /  RetailVision2026!" -ForegroundColor White
Write-Host "  - Webcam: en edge\.env -> CAMERA_SOURCE=0 y SHOW_DISPLAY=true" -ForegroundColor White
Write-Host "  - Para lanzar el pipeline de vision (en OTRA terminal):" -ForegroundColor White
Write-Host "      cd edge ; .\venv\Scripts\python.exe -u main.py" -ForegroundColor DarkGray

# --- 3. Levantar el server ---
Write-Host ""
Write-Host "[3/3] Levantando el dashboard en http://localhost:3008 ..." -ForegroundColor Yellow
Write-Host "      (Ctrl+C para frenar)" -ForegroundColor DarkGray
Write-Host ""
npm run dev -- -p 3008
