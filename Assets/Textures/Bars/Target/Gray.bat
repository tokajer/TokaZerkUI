@echo off
color 04


echo Changing FloatingBar Color
echo.



rem Insert commands to change the option here

copy Gray\*.tga ..\




rem Pauses batch file if shell command was not hidden otherwise skips

if "%1" == "-h" goto end

:end

