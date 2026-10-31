@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo CHUA CAI NODE.JS. Hay tai ban LTS tai https://nodejs.org roi cai dat, sau do bam dup lai file nay.
  pause
  exit /b
)
if not exist "public\index.html" (
  echo THIEU FILE public\index.html. Thu muc bevui phai co: server.js va thu muc public chua index.html.
  pause
  exit /b
)
echo Dang khoi dong... Cua so nay phai MO trong luc dung web. Ma xac nhan giao vien se hien o duoi.
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
node server.js
echo.
echo May chu da dung. Neu thay loi o tren, hay chup man hinh gui lai.
pause
