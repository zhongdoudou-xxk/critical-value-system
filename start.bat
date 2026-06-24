@echo off
echo 启动危急值闭环处理系统...
echo 检查Node.js环境...
node --version
if %errorlevel% neq 0 (
    echo Node.js未安装，请先安装Node.js
    pause
    exit /b 1
)

echo 检查依赖...
if not exist node_modules (
    echo 安装依赖中...
    npm.cmd install
)

echo 启动服务...
npm.cmd start
pause
