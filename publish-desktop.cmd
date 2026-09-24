@echo off
REM Nderton aplikacionin desktop Smart Screen (Electron) -> instalues .exe
REM Nise nga dosja kryesore e projektit:  publish-desktop.cmd
setlocal
cd /d "%~dp0"

REM 1. Pastro serverin e vjeter (mbaje .gitkeep)
for /d %%D in (electron\server\*) do rmdir /s /q "%%D"
for %%F in (electron\server\*) do if /i not "%%~nxF"==".gitkeep" del /q "%%F"

REM 2. Backend .NET + Frontend React me nje komande
REM    -> React ndertohet automatikisht (npm run build) dhe futet ne wwwroot\app
REM    -> gjithcka (bashke me .NET brenda) kopjohet ne electron\server
dotnet publish backend\SmartScreen.Api -c Release -r win-x64 --self-contained true -o electron\server || goto :error

REM 3. Kontrollo qe serveri u kopjua
if not exist electron\server\SmartScreen.Api.exe goto :error
if not exist electron\server\wwwroot\app\index.html goto :error

REM 4. Electron build -> electron\dist
cd electron
if not exist node_modules call npm install || goto :error
call npm run dist || goto :error

echo.
echo Gati! Instaluesi:
dir /b dist\*.exe
exit /b 0

:error
echo.
echo GABIM - ndertimi deshtoi. Shikoni mesazhin me siper.
exit /b 1
