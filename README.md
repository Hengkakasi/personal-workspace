# 个人工作台

一个 PHP + MySQL 的个人事务管理系统。

## 功能
- 🌱 个人提升（Notion 风格树形笔记）
- ✅ 待办事项（列表 / 月历 / 日程）
- 💼 面试记录
- 👤 个人资料
- 📍 好去处

## 部署
1. 导入 `sql/schema.sql` 到 MySQL
2. 复制 `config.example.php` 为 `config.php`，填入数据库信息
3. 上传所有文件到 PHP 服务器
4. 访问 `index.html`

## 技术栈
- 前端：原生 JS + Quill 富文本
- 后端：PHP + PDO
- 数据库：MySQL
