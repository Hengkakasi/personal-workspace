# 个人工作台

一个 PHP + MySQL 的个人事务管理系统。

## 功能
- 🌱 个人提升（Notion 风格树形笔记）
- ✅ 待办事项（列表 / 月历 / 日程）
- 💼 面试记录
- 👤 个人资料
- 📍 好去处

## 部署
### 1. 安装本地 PHP 环境 （XAMPP）- https://www.apachefriends.org/download.html
启动 Apache 和 MySQL。

### 2. 下载项目
将项目下载或 Clone 到 XAMPP 的 htdocs 目录。 （ C:\xampp\htdocs\personal-workspace ）


### 3. 创建 MySQL 数据库
- 打开 phpMyAdmin：访问 http://localhost/phpmyadmin
- 创建一个新的 MySQL 数据库 **personal_workspace**
- 然后导入项目中的数据库结构：**schema.sql**
- 默认登录：Username: **admin**，Password: **admin123**

### 4. 启动项目
确保 Apache 和 MySQL 已启动，然后在浏览器访问：

http://localhost/personal-workspace/

即可使用个人工作台。

## 技术栈
- 前端：原生 JS + Quill 富文本
- 后端：PHP + PDO
- 数据库：MySQL
