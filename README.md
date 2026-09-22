# 🌱 个人工作台 · Personal Workspace

> 一个自托管的个人事务管理系统 —— 把笔记、待办、求职、资料、收藏，全部收进一个属于你自己的空间。

<p align="center">
  <img src="https://img.shields.io/badge/PHP-8.x-777BB4?style=flat-square&logo=php&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-8.x-4479A1?style=flat-square&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=flat-square&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Quill-1.3.7-1B9AAA?style=flat-square" />
  <img src="https://img.shields.io/badge/License-Private-red?style=flat-square" />
</p>

---

## ✨ 为什么用它？

- 🧠 **像 Notion 一样自由** —— 无限层级的树形笔记，文件夹与文件任意嵌套
- ✍️ **所见即所得的富文本** —— 基于 Quill，支持标题、列表、代码块、图片、链接
- 💾 **编辑即保存** —— 停止输入 0.8 秒自动写入数据库，无需点保存按钮
- 📅 **三种视角看待办** —— 月历 / 日程 / 列表，任你切换
- 🔔 **到点提醒** —— 浏览器通知 + 震动，重要的事绝不漏掉
- 📤 **一键同步到 Google Calendar** —— 待办秒变日程
- 🌓 **马来西亚时区优化** —— 日程红线永远指向"现在"
- 📱 **完整移动端适配** —— 手机、平板、桌面皆可用
- 🔒 **自托管，数据在你手上** —— 没有云服务，没有第三方，隐私 100% 归你

---

## 🧩 五大模块

### 🌱 个人提升 · Notion-style Knowledge Base
> 用来放你的读书笔记、学习记录、方法论、复盘。

- 树形结构：无限层级文件夹 + 文件任意嵌套
- 富文本编辑：标题 / 加粗 / 斜体 / 下划线 / 颜色 / 有序无序列表 / 引用 / 代码块 / 链接 / 图片
- 图片自动压缩（最大宽度 1200px）再上传
- 自动保存（防抖 800ms）
- 悬停操作：新建子项 / 重命名 / 删除
- 拖拽排序（`sort_order` 字段驱动）
- 侧边栏搜索：跨所有模块统一检索
<img width="1862" height="868" alt="image" src="https://github.com/user-attachments/assets/8c720c74-299c-4390-8d9c-750f104e3195" />

### ✅ 待办事项 · Todo with 3 Views
> 你的日常任务、项目跟进、习惯打卡。

- **三种视图**：
  - 📅 **月历视图**：整月任务一屏掌握，点某天弹出当天全部安排
  - 📆 **日程视图**：Google Calendar 风格，日/周切换，红线显示当前时间
  - 📋 **列表视图**：状态 + 分类双重筛选
- **状态机**：未开始 / 进行中 / 已完成（三态进度，与 `completed` 双写）
- **优先级**：高 / 中 / 低（左侧色条直观显示）
- **分类**：工作 / 生活 / 学习 / 无分类
- **提醒**：`datetime` 精确到分钟，到点浏览器通知 + 手机震动
- **Google Calendar**：一键生成日历事件链接，包含标题 / 时间 / 备注
- **快速添加**：点击日程空格，自动填好对应时间
<img width="1910" height="870" alt="image" src="https://github.com/user-attachments/assets/4c726333-344c-4bf3-a516-ae59bcb27c3e" />
<img width="1891" height="863" alt="image" src="https://github.com/user-attachments/assets/f62e5c68-5f6f-4c87-88ac-e725767e24e0" />
<img width="1897" height="865" alt="image" src="https://github.com/user-attachments/assets/c34ab086-23cc-4e53-aac6-7dadbf05cec9" />

### 💼 面试记录 · Job Tracker
> 追踪每一次投递、面试、结果。

- **基础信息**：公司 / 职位 / 日期 / 地点 / 薪资 / 状态
- **状态管理**：准备面试 / 等通知 / 未通过
- **面试 Script**：8 个独立字段，面试前对着念
  - 📋 Job Scope —— 岗位职责
  - 🎯 Mission —— 公司使命
  - 🛠️ Services —— 产品/服务
  - 💬 Script —— 自我介绍话术
  - 💪 Strength —— 优势
  - ⚠️ Weakness —— 劣势
  - ❓ Interview Question —— 面试官可能问的
  - 🙋 Question to Ask —— 你想问的
- **独立 Script 视图**：大字号排版，一页看完
- **日历联动**：面试日期自动显示在月历上（紫色标记）
<img width="1917" height="867" alt="image" src="https://github.com/user-attachments/assets/fd8b3956-f464-4c3e-9dcc-fce45103465e" />
<img width="1917" height="856" alt="image" src="https://github.com/user-attachments/assets/ca8fc892-a7e4-4b10-82a5-02caa3336d22" />

### 👤 个人资料 · Document Vault
> 存你的简历、证书、成绩单、Offer。

- 支持上传文件：PDF / DOC / DOCX / TXT / JPG / PNG / JPEG（最大 20MB）
- 文件夹分类：个人 / 学习 / 工作（+ 自定义）
- 卡片展开 / 收起：内容多时自动截断，点击展开
- 一键查看 / 下载附件
- 图标自定义（12 种 emoji 可选）
<img width="1897" height="471" alt="image" src="https://github.com/user-attachments/assets/ecf2d69f-6158-4131-8531-d861c60934b6" />
<img width="1917" height="862" alt="image" src="https://github.com/user-attachments/assets/db864660-048e-44fa-ae96-82deb965be0c" />

### 📍 好去处 · Places Collection
> 收藏你去过或想去的餐厅、咖啡馆、景点。

- 6 种分类：美食 / 咖啡 / 景点 / 购物 / 娱乐 / 其他
- 1-5 星评分
- 地址 + 备注
- 卡片网格布局

---

## 🎨 全局功能

| 功能 | 说明 |
|---|---|
| 🔍 全局搜索 | `Ctrl+K` 唤起，跨 5 个模块统一检索，结果高亮关键词 |
| ⌨️ 快捷键 | `Ctrl+K` 搜索 · `Esc` 关闭弹窗 |
| 🌓 折叠侧边栏 | 桌面端一键收起，移动端抽屉式 |
| 🎯 拖拽排序 | 侧边栏模块顺序可拖拽，自动保存到 localStorage |
| 💬 Toast 提示 | 成功 / 警告 / 错误 / 信息 四态 |
| 🔐 登录鉴权 | 用户名 + 密码（MD5），token 存在 localStorage |
| 🚫 反索引保护 | `X-Robots-Tag: noindex, nofollow` 防止被搜索引擎收录 |
| 📤 文件上传 | 图片自动压缩，文件名安全化 |

---

## 🚀 部署（5 分钟）

### 1. 安装本地环境

下载 **XAMPP**：https://www.apachefriends.org/download.html

安装后启动 **Apache** 和 **MySQL**。

### 2. 下载项目

Clone 或下载本项目到 XAMPP 的 `htdocs` 目录：

### 3. 创建 MySQL 数据库

- 打开 phpMyAdmin：访问 http://localhost/phpmyadmin
- 创建一个新的 MySQL 数据库 `personal_workspace`
- 然后导入项目中的数据库结构：`schema.sql`
- 默认登录：Username: `admin`，Password: `admin123`

### 4. 启动项目

确保 Apache 和 MySQL 已启动，然后在浏览器访问：http://localhost/personal-workspace/

## 技术栈
- 前端：原生 JS + Quill 富文本
- 后端：PHP + PDO
- 数据库：MySQL
