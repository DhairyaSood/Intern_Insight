@echo off
echo Starting React Frontend on Port 3001...
set PORT=3001
rem Avoid 431 Request Header Fields Too Large in dev (e.g., large localhost cookies)
set NODE_OPTIONS=--max-http-header-size=65536
npm start
