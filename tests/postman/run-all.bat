@echo off
REM Windows version of run-all.sh for running Postman collections
setlocal

set SCRIPT_DIR=%~dp0
set ENV=%~1
if "%ENV%"=="" set ENV=%SCRIPT_DIR%ci-stack-environment.json

set COL=%SCRIPT_DIR%collections
set REPORT_DIR=%SCRIPT_DIR%reports

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"

echo Using environment: %ENV%
echo Reports directory: %REPORT_DIR%
echo.

echo Waiting 4 seconds for services to become healthy...
timeout /t 4 /nobreak

echo Running collection: organisations.collection.json
call newman run "%COL%\organisations.collection.json" -e "%ENV%" -r cli,htmlextra --reporter-htmlextra-export "%REPORT_DIR%\organisations.html"

echo Running collection: permissions.collection.json
call newman run "%COL%\permissions.collection.json" -e "%ENV%" -r cli,htmlextra --reporter-htmlextra-export "%REPORT_DIR%\permissions.html"

echo Running collection: users.collection.json
call newman run "%COL%\users.collection.json" -e "%ENV%" -r cli,htmlextra --reporter-htmlextra-export "%REPORT_DIR%\users.html"

echo Running collection: user-groups.collection.json
call newman run "%COL%\user-groups.collection.json" -e "%ENV%" -r cli,htmlextra --reporter-htmlextra-export "%REPORT_DIR%\user-groups.html"

echo Running collection: classifiers.collection.json
call newman run "%COL%\classifiers.collection.json" -e "%ENV%" -r cli,htmlextra --reporter-htmlextra-export "%REPORT_DIR%\classifiers.html"

echo.
echo All collections passed.
echo HTML reports:
dir "%REPORT_DIR%\*.html" /b
