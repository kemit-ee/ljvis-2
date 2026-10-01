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

set FAILED=
echo Running collection: organisations.collection.json
call newman run "%COL%\organisations.collection.json" -e "%ENV%" -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\organisations.html" --reporter-json-export "%REPORT_DIR%\organisations.json"
if errorlevel 1 set FAILED=%FAILED% organisations

echo Running collection: permissions.collection.json
call newman run "%COL%\permissions.collection.json" -e "%ENV%" -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\permissions.html" --reporter-json-export "%REPORT_DIR%\permissions.json"
if errorlevel 1 set FAILED=%FAILED% permissions

echo Running collection: users.collection.json
call newman run "%COL%\users.collection.json" -e "%ENV%" -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\users.html" --reporter-json-export "%REPORT_DIR%\users.json"
if errorlevel 1 set FAILED=%FAILED% users

echo Running collection: user-groups.collection.json
call newman run "%COL%\user-groups.collection.json" -e "%ENV%" -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\user-groups.html" --reporter-json-export "%REPORT_DIR%\user-groups.json"
if errorlevel 1 set FAILED=%FAILED% user-groups

echo Running collection: classifiers.collection.json
call newman run "%COL%\classifiers.collection.json" -e "%ENV%" --delay-request 600 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\classifiers.html" --reporter-json-export "%REPORT_DIR%\classifiers.json"
if errorlevel 1 set FAILED=%FAILED% classifiers

echo Running collection: compound-form.collection.json
call newman run "%COL%\compound-form.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\compound-form.html" --reporter-json-export "%REPORT_DIR%\compound-form.json"
if errorlevel 1 set FAILED=%FAILED% compound-form

echo Running collection: driverest-forms.collection.json
call newman run "%COL%\driverest-forms.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\driverest-forms.html" --reporter-json-export "%REPORT_DIR%\driverest-forms.json"
if errorlevel 1 set FAILED=%FAILED% driverest-forms

echo Running collection: tram-control-card.collection.json
call newman run "%COL%\tram-control-card.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\tram-control-card.html" --reporter-json-export "%REPORT_DIR%\tram-control-card.json"
if errorlevel 1 set FAILED=%FAILED% tram-control-card

echo Running collection: labour-inspection.collection.json
call newman run "%COL%\labour-inspection.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\labour-inspection.html" --reporter-json-export "%REPORT_DIR%\labour-inspection.json"
if errorlevel 1 set FAILED=%FAILED% labour-inspection

echo Running collection: foreign-violation-form.collection.json
call newman run "%COL%\foreign-violation-form.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\foreign-violation-form.html" --reporter-json-export "%REPORT_DIR%\foreign-violation-form.json"
if errorlevel 1 set FAILED=%FAILED% foreign-violation-form

echo Running collection: erru-ctud.collection.json
call newman run "%COL%\erru-ctud.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\erru-ctud.html" --reporter-json-export "%REPORT_DIR%\erru-ctud.json"
if errorlevel 1 set FAILED=%FAILED% erru-ctud

echo Running collection: erru-cgr.collection.json
call newman run "%COL%\erru-cgr.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\erru-cgr.html" --reporter-json-export "%REPORT_DIR%\erru-cgr.json"
if errorlevel 1 set FAILED=%FAILED% erru-cgr

echo Running collection: erru-rsi.collection.json
call newman run "%COL%\erru-rsi.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\erru-rsi.html" --reporter-json-export "%REPORT_DIR%\erru-rsi.json"
if errorlevel 1 set FAILED=%FAILED% erru-rsi

echo Running collection: erru-ncr.collection.json
call newman run "%COL%\erru-ncr.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\erru-ncr.html" --reporter-json-export "%REPORT_DIR%\erru-ncr.json"
if errorlevel 1 set FAILED=%FAILED% erru-ncr

echo Running collection: erru-nu.collection.json
call newman run "%COL%\erru-nu.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\erru-nu.html" --reporter-json-export "%REPORT_DIR%\erru-nu.json"
if errorlevel 1 set FAILED=%FAILED% erru-nu

echo Running collection: erru-xml-adapter.collection.json
call newman run "%COL%\erru-xml-adapter.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\erru-xml-adapter.html" --reporter-json-export "%REPORT_DIR%\erru-xml-adapter.json"
if errorlevel 1 set FAILED=%FAILED% erru-xml-adapter

echo Running collection: technical-check-forms.collection.json
call newman run "%COL%\technical-check-forms.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\technical-check-forms.html" --reporter-json-export "%REPORT_DIR%\technical-check-forms.json"
if errorlevel 1 set FAILED=%FAILED% technical-check-forms

echo Running collection: transport-interruption.collection.json
call newman run "%COL%\transport-interruption.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\transport-interruption.html" --reporter-json-export "%REPORT_DIR%\transport-interruption.json"
if errorlevel 1 set FAILED=%FAILED% transport-interruption

echo Running collection: adr-form.collection.json
call newman run "%COL%\adr-form.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\adr-form.html" --reporter-json-export "%REPORT_DIR%\adr-form.json"
if errorlevel 1 set FAILED=%FAILED% adr-form

echo Running collection: good-repute-form.collection.json
call newman run "%COL%\good-repute-form.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\good-repute-form.html" --reporter-json-export "%REPORT_DIR%\good-repute-form.json"
if errorlevel 1 set FAILED=%FAILED% good-repute-form

echo Running collection: form-search.collection.json
call newman run "%COL%\form-search.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\form-search.html" --reporter-json-export "%REPORT_DIR%\form-search.json"
if errorlevel 1 set FAILED=%FAILED% form-search

echo Running collection: xroad-provide-query.collection.json
call newman run "%COL%\xroad-provide-query.collection.json" -e "%ENV%" -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\xroad-provide-query.html" --reporter-json-export "%REPORT_DIR%\xroad-provide-query.json"
if errorlevel 1 set FAILED=%FAILED% xroad-provide-query

echo Running collection: xroad-provide-write.collection.json
call newman run "%COL%\xroad-provide-write.collection.json" -e "%ENV%" -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\xroad-provide-write.html" --reporter-json-export "%REPORT_DIR%\xroad-provide-write.json"
if errorlevel 1 set FAILED=%FAILED% xroad-provide-write

echo Running collection: risk-scores.collection.json
call newman run "%COL%\risk-scores.collection.json" -e "%ENV%" -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\risk-scores.html" --reporter-json-export "%REPORT_DIR%\risk-scores.json"
if errorlevel 1 set FAILED=%FAILED% risk-scores

echo Running collection: citizen-representation.collection.json
call newman run "%COL%\citizen-representation.collection.json" -e "%ENV%" -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\citizen-representation.html" --reporter-json-export "%REPORT_DIR%\citizen-representation.json"
if errorlevel 1 set FAILED=%FAILED% citizen-representation

echo Running collection: cron-jobs.collection.json
call newman run "%COL%\cron-jobs.collection.json" -e "%ENV%" -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\cron-jobs.html" --reporter-json-export "%REPORT_DIR%\cron-jobs.json"
if errorlevel 1 set FAILED=%FAILED% cron-jobs

echo Running collection: notifications.collection.json
call newman run "%COL%\notifications.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\notifications.html" --reporter-json-export "%REPORT_DIR%\notifications.json"
if errorlevel 1 set FAILED=%FAILED% notifications

echo Running collection: audit-log.collection.json
call newman run "%COL%\audit-log.collection.json" -e "%ENV%" -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\audit-log.html" --reporter-json-export "%REPORT_DIR%\audit-log.json"
if errorlevel 1 set FAILED=%FAILED% audit-log

echo Running collection: dashboard.collection.json
call newman run "%COL%\dashboard.collection.json" -e "%ENV%" --delay-request 300 -r cli,htmlextra,json --reporter-htmlextra-export "%REPORT_DIR%\dashboard.html" --reporter-json-export "%REPORT_DIR%\dashboard.json"
if errorlevel 1 set FAILED=%FAILED% dashboard

echo.
if not "%FAILED%"=="" (
  echo Kukkunud kollektsioonid:%FAILED%
  exit /b 1
)
echo All collections passed.
echo HTML reports:
dir "%REPORT_DIR%\*.html" /b
