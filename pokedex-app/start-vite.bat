@echo off
cd /d "%~dp0"
set PATH=C:\Users\Admin\AppData\Roaming\fnm\node-versions\v24.18.0\installation;%PATH%
start /B cmd /c "node.exe node_modules\vite\bin\vite.js > vite.log 2>&1"
echo Vite started on port 5173
