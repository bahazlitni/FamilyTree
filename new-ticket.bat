@echo off
setlocal enabledelayedexpansion

:: Generate ticket ID
for /f %%a in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set TICKET_ID=%%a

:: Create ticket template with ticket ID
(
echo '''
echo USING WINDOWS, NEXT JS LATEST, TYPESCRIPT, ESLINT
echo TICKET-ID: !TICKET_ID!
echo TITLE: 
echo.
echo TASK:
echo [-] Debugging
echo [-] Refactoring
echo [-] Optimization
echo [-] Simplification
echo [-] Cleaning
echo [-] Redesigning
echo [-] Suggesting Changes
echo [+] Other
echo.
echo OPTIONS:
echo [+] Provide entire code solutions
echo [-] No comments, else only when necessary
echo [+] Keep same syntax style
echo [+] Ask before assuming anything
echo [+] Use best practices
echo [+] Keep general behavior unchanged
echo.
echo CONTEXT:
echo.
echo CODE:
echo.
echo GLOBAL:
echo.
echo GOAL:
echo.
echo NOTES:
echo.
echo PROJECT-STRUCTURE:
) > ticket.txt

:: Append project structure using git ls-files
git ls-files | findstr /V /I /C:"node_modules" /C:".env" /C:".next" /C:".git" /C:"public" /C:"coverage" /C:"dist" >> ticket.txt

echo ''' >> ticket.txt
echo Ticket created successfully: ticket.txt
