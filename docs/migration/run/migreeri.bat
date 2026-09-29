@echo off
setlocal
cd /d "%~dp0"
python migrate_backup.py %*
set "RESULT=%ERRORLEVEL%"
echo Tagastuskood: %RESULT%. Vaata logi loppseisu.
pause
exit /b %RESULT%
