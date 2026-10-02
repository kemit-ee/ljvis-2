@echo off
REM LJVIS1 manuste inventuur. Ainult lugemine; faile ei muudeta.
setlocal
cd /d "%~dp0"

echo.
echo   LJVIS1 manuste inventuur
echo   ------------------------
echo.
echo   Sisesta failikausta tee (Paths.FormDocuments).
echo   Naide: D:\LJVIS\FormDocuments
echo.

set /p KAUST=  Kaust: 

python failide_inventuur.py "%KAUST%"
if errorlevel 1 (
  echo.
  echo   EI ONNESTUNUD. Kontrolli kausta teed.
  echo   Kui teade on "python ei ole tuntud kask", paigalda Python 3
  echo   aadressilt python.org ja margi "Add Python to PATH".
  echo.
)
pause
