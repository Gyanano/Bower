@echo off
setlocal

rem Official OpenAI testing path.
rem Paste your real key below before running.
set BOWER_AI_PROVIDER=openai
set BOWER_OPENAI_API_KEY=PASTE_YOUR_OPENAI_KEY_HERE

rem Recommended low-cost default for this repo's current image-analysis flow.
rem If your account explicitly supports a cheaper/smaller vision-capable model,
rem you can replace this value manually.
set BOWER_OPENAI_MODEL=gpt-4.1-mini

if "%BOWER_OPENAI_API_KEY%"=="PASTE_YOUR_OPENAI_KEY_HERE" (
  echo.
  echo [Bower] Please edit run-openai-server.cmd and paste your real OpenAI API key.
  echo.
  pause
  exit /b 1
)

echo.
echo [Bower] Starting backend with official OpenAI settings...
echo [Bower] Provider: %BOWER_AI_PROVIDER%
echo [Bower] Model: %BOWER_OPENAI_MODEL%
echo.

npm run dev:server
