@echo off
chcp 65001 >nul

echo === Genius Info Addon - Dev mode ===
echo.

where yarn >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Yarn не найден. Устанавливаю...

    npm install -g yarn --allow-scripts=yarn || (
        echo.
        echo [ERROR] Не удалось установить Yarn.
        pause
        exit /b 1
    )

    echo.
    echo [INFO] Yarn успешно установлен.
    echo [INFO] Перезапустите этот скрипт.
    pause
    exit /b 0
)

if not exist node_modules (
    echo Устанавливаем зависимости...
    call yarn
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] yarn install неожиданно завершил работу.
        pause
        exit /b 1
    )
    echo.
)

echo Запускается режим наблюдения...
echo Аддон будет пересобираться при каждом изменении файлов.
echo Ctrl+C чтобы остановить.
echo.
call yarn dev
pause
