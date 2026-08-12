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

echo Running collection: labour-inspection.collection.json
call newman run "%COL%\labour-inspection.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra --reporter-htmlextra-export "%REPORT_DIR%\labour-inspection.html"

echo Running collection: erru-ctud.collection.json
call newman run "%COL%\erru-ctud.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra --reporter-htmlextra-export "%REPORT_DIR%\erru-ctud.html"

echo.

echo Running collection: erru-cgr.collection.json
call newman run "%COL%\erru-cgr.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra --reporter-htmlextra-export "%REPORT_DIR%\erru-cgr.html"

echo.
echo All collections passed.
echo HTML reports:
dir "%REPORT_DIR%\*.html" /b
=======
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

echo Running collection: labour-inspection.collection.json
call newman run "%COL%\labour-inspection.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra --reporter-htmlextra-export "%REPORT_DIR%\labour-inspection.html"

echo Running collection: technical-check-forms.collection.json
call newman run "%COL%\technical-check-forms.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra --reporter-htmlextra-export "%REPORT_DIR%\technical-check-forms.html"

echo Running collection: transport-interruption.collection.json
call newman run "%COL%\transport-interruption.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra --reporter-htmlextra-export "%REPORT_DIR%\transport-interruption.html"

echo Running collection: adr-form.collection.json
call newman run "%COL%\adr-form.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra --reporter-htmlextra-export "%REPORT_DIR%\adr-form.html"

echo Running collection: good-repute-form.collection.json
call newman run "%COL%\good-repute-form.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra --reporter-htmlextra-export "%REPORT_DIR%\good-repute-form.html"

echo Running collection: form-search.collection.json
call newman run "%COL%\form-search.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra --reporter-htmlextra-export "%REPORT_DIR%\form-search.html"

echo.
echo All collections passed.
echo HTML reports:
dir "%REPORT_DIR%\*.html" /b
