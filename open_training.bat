@echo off
cd /d "%~dp0"
if exist "%~dp0.venv\Scripts\pythonw.exe" (
    start "" "%~dp0.venv\Scripts\pythonw.exe" "%~dp0training_app.py"
) else (
    echo Python environment not found. Follow the installation instructions in TRAINING.md.
    pause
)
