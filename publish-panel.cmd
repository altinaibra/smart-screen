@echo off
REM Nderton aplikacionin "Smart Screen Panel" (vetem paneli, pa server) -> instalues .exe me ikone
REM Nise nga dosja kryesore e projektit:  publish-panel.cmd
setlocal
cd /d "%~dp0electron-panel"
call npm install || goto :error
call npm run dist || goto :error
echo.
echo Gati! Instaluesi:
dir /b dist\*.exe
exit /b 0
:error
echo.
echo GABIM - ndertimi deshtoi. Shikoni mesazhin me siper.
exit /b 1
