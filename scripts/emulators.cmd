@echo off
set "PATH=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\bin;%PATH%"
cd /d "%~dp0.."
firebase emulators:start --only auth,firestore,storage,functions,hosting --project biblesketch-5104c
