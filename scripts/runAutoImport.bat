@echo off
echo Wymagane jest zainstalowane srodowisko Node.js na tym komputerze do wykonania skryptu.
echo Rozpoczecie automatycznego importu zestawienie.csv...
echo.

cd /d "%~dp0\.."

:: Uruchamiamy wykorzystujac silnik MJS Node'a.
node scripts/autoImportCsv.mjs

echo.
echo === ZAKONCZONO ===
pause
