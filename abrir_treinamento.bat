@echo off
cd /d "%~dp0"
if exist "%~dp0.venv\Scripts\pythonw.exe" (
    start "" "%~dp0.venv\Scripts\pythonw.exe" "%~dp0interface_treinamento.py"
) else (
    echo Ambiente Python nao encontrado. Siga as instrucoes de instalacao em TREINAMENTO.md.
    pause
)
