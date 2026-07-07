@echo off
cd /d "C:\Users\Admin\Documents\GitHub\pokemon-dataset-zh"
for /f "tokens=2 delims==" %%i in ('fnm env ^| find "FNM_MULTISHELL_PATH"') do set "FNM_PATH=%%i"
if "%FNM_PATH%"=="" (
  echo Failed to get fnm path
  exit /b 1
)
"%FNM_PATH%\node.exe" scripts/generation_moves.js %*
