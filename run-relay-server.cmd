@echo off
setlocal

rem Fill in your relay/OpenAI-compatible settings before running.
set BOWER_AI_PROVIDER=openai
set BOWER_OPENAI_BASE_URL=https://api.gptsapi.net
set BOWER_OPENAI_API_KEY=PASTE_YOUR_KEY_HERE
set BOWER_OPENAI_MODEL=gpt-5.1

if "%BOWER_OPENAI_API_KEY%"=="PASTE_YOUR_KEY_HERE" (
  echo.
  echo [Bower] Please edit run-relay-server.cmd and paste your real API key.
  echo.
  pause
  exit /b 1
)

echo.
echo [Bower] Starting backend with relay settings...
echo [Bower] Provider: %BOWER_AI_PROVIDER%
echo [Bower] Base URL: %BOWER_OPENAI_BASE_URL%
echo [Bower] Model: %BOWER_OPENAI_MODEL%
echo.

npm run dev:server
