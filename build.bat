@echo off
chcp 65001 >nul

echo === Genius Info Addon - Build ===
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
    echo [1/2] Устанавливаем зависимости...
    call yarn
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] yarn install неожиданно завершил работу.
        pause
        exit /b 1
    )
) else (
    echo [1/2] node_modules уже есть, установка зависимостей пропущена.
)

echo.
echo [2/2] Собираем и копируем в PulseSync...
call yarn build:sync
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Сборка неожиданно завершилась, подробности в логе выше.
    pause
    exit /b 1
)

echo.
echo [OK] Готово! Сборка выполнена.
echo.
pause
