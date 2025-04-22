@echo off
set "NODE_OPTIONS=--trace-warnings --trace-uncaught"
cd %~dp0
npx react-scripts start 