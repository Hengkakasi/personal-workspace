// =============================================
// API 封装
// =============================================
const API = {
    baseUrl: 'api.php',
    async request(action, data = null, id = null) {
        let url = `${this.baseUrl}?action=${action}`;
        if (id) url += `&id=${id}`;
        const options = { method: data ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' } };
        if (data) options.body = JSON.stringify(data);
        const response = await fetch(url, options);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${response.status}`);
        }
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        return result;
    },
    login: (data) => API.request('login', data),

    // ===== 个人提升（替代原来的笔记） =====
    getGrowthNodes: () => API.request('get_growth_nodes'),
    saveGrowthNode: (data, id) => API.request('save_growth_node', data, id),
    deleteGrowthNode: (id) => API.request('delete_growth_node', null, id),
    moveGrowthNode: (data, id) => API.request('move_growth_node', data, id),

    // ===== 待办 =====
    getTodos: () => API.request('get_todos'),
    saveTodo: (data, id) => API.request('save_todo', data, id),
    toggleTodo: (id) => API.request('toggle_todo', null, id),
    deleteTodo: (id) => API.request('delete_todo', null, id),

    // ===== 面试 =====
    getInterviews: () => API.request('get_interviews'),
    saveInterview: (data, id) => API.request('save_interview', data, id),
    deleteInterview: (id) => API.request('delete_interview', null, id),

    // ===== 个人资料 =====
    getProfiles: () => API.request('get_profiles'),
    saveProfile: (data, id) => API.request('save_profile', data, id),
    deleteProfile: (id) => API.request('delete_profile', null, id),

    // ===== 好去处 =====
    getPlaces: () => API.request('get_places'),
    savePlace: (data, id) => API.request('save_place', data, id),
    deletePlace: (id) => API.request('delete_place', null, id),
};

// =============================================
// 应用状态
// =============================================
const App = {
    currentModule: 'todos',
    data: {
        // ===== 个人提升（替代 notes/folders） =====
        growthNodes: [],
        growthCurrentId: null,
        growthExpanded: {},
        profileFolder: 'all',
        
        // ===== 其他模块 =====
        todos: [], interviews: [], profiles: [], places: [],
        todoFilter: 'all', interviewFilter: 'all',
        categoryFilter: 'all',
        todoView: 'calendar',
        calendarDate: new Date(),
        scheduleDate: new Date(),
        scheduleMode: 'day'
    },
    reminderInterval: null,
    notifiedReminders: new Set(),
    isLoggedIn: false,
    draggedItem: null,
    _searchBound: false,
    quillInstances: {},
    growthQuill: null,

    // ============ 初始化 ============
    async init() {
        document.getElementById('login-btn').onclick = () => this.login();
        document.getElementById('login-password').onkeydown = (e) => {
            if (e.key === 'Enter') this.login();
        };

        if (!this.checkLogin()) {
            document.getElementById('login-overlay').style.display = 'flex';
            return;
        }
        this.isLoggedIn = true;
        document.getElementById('login-overlay').style.display = 'none';
        this.setupEventListeners();
        this.initSidebar();
        this.setupNavigation();
        this.setupDragAndDrop();
        this.setupReminderChecker();
        await this.loadAllData();
        this.updateBadges();
        this.render();
        this.requestNotificationPermission();
    },

    setupEventListeners() {
        document.getElementById('collapse-btn').onclick = () => this.toggleSidebar();
        document.getElementById('logout-btn').onclick = () => this.logout();
        document.getElementById('mobile-menu-btn').onclick = () => this.toggleMobileSidebar();
        document.getElementById('sidebar-overlay').onclick = () => this.closeMobileSidebar();
        document.getElementById('btn-add').onclick = () => this.handleAdd();
        this.setupSearch();
        this.setupSearchToggle();
    },

    checkLogin() {
        return localStorage.getItem('workspace_token') !== null;
    },

    // ============ 登录/登出 ============
    async login() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        if (!username || !password) {
            errorEl.textContent = '请输入用户名和密码';
            errorEl.classList.add('show');
            return;
        }
        try {
            const result = await API.login({ username, password });
            if (result.success) {
                localStorage.setItem('workspace_token', result.token);
                this.isLoggedIn = true;
                document.getElementById('login-overlay').style.display = 'none';
                errorEl.classList.remove('show');
                errorEl.textContent = '';
                this.setupEventListeners();
                this.initSidebar();
                this.setupNavigation();
                this.setupDragAndDrop();
                this.setupReminderChecker();
                await this.loadAllData();
                this.updateBadges();
                this.render();
                this.showToast('登录成功！欢迎回来', 'success');
            }
        } catch (error) {
            errorEl.textContent = error.message || '登录失败';
            errorEl.classList.add('show');
        }
    },

    logout() {
        if (!confirm('确定要退出登录吗？')) return;
        localStorage.removeItem('workspace_token');
        this.isLoggedIn = false;
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-error').classList.remove('show');
        this.showToast('已退出登录', 'info');
    },

    // ============ 侧边栏 ============
    initSidebar() {
        if (window.innerWidth <= 768) return;
        const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
        if (isCollapsed) document.getElementById('sidebar').classList.add('collapsed');
    },

    toggleSidebar() {
        if (window.innerWidth <= 768) { this.toggleMobileSidebar(); return; }
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
        const btn = sidebar.querySelector('.collapse-btn');
        if (btn) btn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
    },

    toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        sidebar.classList.toggle('mobile-open');
        if (overlay) overlay.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('mobile-open') ? 'hidden' : '';
    },

    closeMobileSidebar() {
        document.getElementById('sidebar').classList.remove('mobile-open');
        const overlay = document.getElementById('sidebar-overlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    },

    // ============ 拖拽排序 ============
    setupDragAndDrop() {
        const container = document.getElementById('nav-items-container');
        if (!container) return;
        const items = container.querySelectorAll('.nav-item');
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                this.draggedItem = null;
                items.forEach(i => i.classList.remove('drag-over'));
            });
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (this.draggedItem && this.draggedItem !== item) item.classList.add('drag-over');
            });
            item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                if (this.draggedItem && this.draggedItem !== item) {
                    const container = document.getElementById('nav-items-container');
                    const items = Array.from(container.querySelectorAll('.nav-item'));
                    const draggedIndex = items.indexOf(this.draggedItem);
                    const targetIndex = items.indexOf(item);
                    if (draggedIndex < targetIndex) item.after(this.draggedItem);
                    else item.before(this.draggedItem);
                    this.saveNavOrder();
                }
                items.forEach(i => i.classList.remove('drag-over'));
            });
        });
    },

    saveNavOrder() {
        const container = document.getElementById('nav-items-container');
        const items = container.querySelectorAll('.nav-item');
        const order = Array.from(items).map(item => item.dataset.module);
        localStorage.setItem('nav_order', JSON.stringify(order));
        this.showToast('菜单顺序已保存', 'success');
    },

    restoreNavOrder() {
        const saved = localStorage.getItem('nav_order');
        if (!saved) return;
        try {
            const order = JSON.parse(saved);
            const container = document.getElementById('nav-items-container');
            order.forEach(module => {
                const item = container.querySelector(`[data-module="${module}"]`);
                if (item) container.appendChild(item);
            });
        } catch (e) {}
    },

    // ============ 数据加载 ============
    async loadAllData() {
        try {
            const [growthNodes, todos, interviews, profiles, places] = await Promise.all([
                API.getGrowthNodes(), API.getTodos(), API.getInterviews(),
                API.getProfiles(), API.getPlaces()
            ]);

            // ===== 个人提升 =====
            this.data.growthNodes = growthNodes.map(n => ({
                id: n.id,
                name: n.name,
                type: n.type,                // 'folder' | 'file'
                content: n.content || '',
                parentId: n.parent_id || null,
                sortOrder: parseInt(n.sort_order) || 0,
                createdAt: n.created_at,
                updatedAt: n.updated_at
            }));

            // ===== 待办 =====
            this.data.todos = todos.map(t => ({
                id: t.id, text: t.text, category: t.category || '', priority: t.priority || 'medium',
                dueDate: t.due_date ? String(t.due_date).replace(' ', 'T') : null,
                reminder: t.reminder ? String(t.reminder).replace(' ', 'T') : null,
                endTime: t.end_time ? String(t.end_time).replace(' ', 'T') : null,
                notes: t.notes || '', completed: t.completed === 1 || t.completed === '1',
                progress: t.progress || 'notstarted', createdAt: t.created_at
            }));

            // ===== 面试 =====
            this.data.interviews = interviews.map(i => ({
                id: i.id, company: i.company, position: i.position || '',
                interviewDate: i.interview_date || '', location: i.location || '',
                salary: i.salary || '', status: i.status || 'preparing',
                notes: i.notes || '', createdAt: i.created_at,
                jobScope: i.job_scope || '', mission: i.mission || '',
                services: i.services || '', interviewScript: i.interview_script || '',
                strength: i.strength || '', weakness: i.weakness || '',
                interviewQuestion: i.interview_question || '', questionToAsk: i.question_to_ask || ''
            }));

            // ===== 个人资料 =====
            this.data.profiles = profiles.map(p => ({
                id: p.id, title: p.title, icon: p.icon || '📄', content: p.content || '',
                folder: p.folder || '未分类', filePath: p.file_path || null,
                createdAt: p.created_at, updatedAt: p.updated_at
            }));

            // ===== 好去处 =====
            this.data.places = places.map(p => ({
                id: p.id, name: p.name, type: p.type || 'other', rating: parseInt(p.rating) || 0,
                address: p.address || '', notes: p.notes || '',
                createdAt: p.created_at, updatedAt: p.updated_at
            }));
        } catch (error) {
            console.error('加载失败:', error);
            this.showToast('加载数据失败: ' + error.message, 'error');
        }
    },

    // ============ 导航 ============
    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = () => {
                this.currentModule = item.dataset.module;
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                this.updateHeader();
                this.render();
                if (window.innerWidth <= 768) this.closeMobileSidebar();
            };
        });
    },

    updateHeader() {
        const titles = {
            growth: '🌱 个人提升',
            todos: '✅ 待办事项',
            interviews: '💼 面试记录',
            profiles: '👤 个人资料',
            places: '📍 好去处'
        };
        document.getElementById('module-title').textContent = titles[this.currentModule] || '📋 工作台';
    },

    updateBadges() {
        const counts = {
            growth: this.data.growthNodes.filter(n => n.type === 'file').length,
            todos: this.data.todos.filter(t => !t.completed).length,
            interviews: this.data.interviews.length,
            profiles: this.data.profiles.length,
            places: this.data.places.length,
        };
        for (const [key, count] of Object.entries(counts)) {
            const badge = document.getElementById('badge-' + key);
            if (badge) badge.textContent = count;
        }
    },

    render() {
        const area = document.getElementById('content-area');
        switch (this.currentModule) {
            case 'growth': this.renderGrowth(area); break;
            case 'todos': this.renderTodos(area); break;
            case 'interviews': this.renderInterviews(area); break;
            case 'profiles': this.renderProfiles(area); break;
            case 'places': this.renderPlaces(area); break;
        }
        this.updateBadges();
    },

    // ============ 通用工具 ============
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const icons = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
        toast.addEventListener('click', () => toast.remove());
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    },

    openModal(html, extraClass = '') {
        document.getElementById('modal-root').innerHTML = `
            <div class="modal-overlay" onclick="if(event.target===this)App.closeModal()">
                <div class="modal ${extraClass}">
                    <button class="modal-close" onclick="App.closeModal()">✕</button>
                    ${html}
                </div>
            </div>`;
        document.body.style.overflow = 'hidden';
    },

    closeModal() {
        document.getElementById('modal-root').innerHTML = '';
        document.body.style.overflow = '';
        this.quillInstances = {};
        this._currentModal = null;
    },

    handleAdd() {
        switch (this.currentModule) {
            case 'growth': this.openGrowthForm(null, 'file'); break;
            case 'todos': this.openTodoForm(); break;
            case 'interviews': this.openInterviewForm(); break;
            case 'profiles': this.openProfileForm(); break;
            case 'places': this.openPlaceForm(); break;
        }
    },

    // ============ 全局搜索 ============
    setupSearch() {
        if (this._searchBound) return;
        this._searchBound = true;

        const searchInput = document.getElementById('global-search');
        const searchClear = document.getElementById('search-clear');
        const searchResults = document.getElementById('search-results');

        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            searchClear.classList.toggle('show', query.length > 0);
            clearTimeout(debounceTimer);
            if (query.length === 0) {
                searchResults.classList.remove('show');
                return;
            }
            debounceTimer = setTimeout(() => this.performSearch(query), 200);
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length > 0) {
                searchResults.classList.add('show');
            }
        });

        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.classList.remove('show');
            searchResults.classList.remove('show');
            searchInput.focus();
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-wrapper')) {
                searchResults.classList.remove('show');
                if (window.innerWidth <= 768) {
                    document.getElementById('search-wrapper').classList.remove('mobile-active');
                    searchInput.value = '';
                    searchClear.classList.remove('show');
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
                searchInput.select();
            }
            if (e.key === 'Escape') {
                searchResults.classList.remove('show');
                searchInput.blur();
            }
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const firstResult = searchResults.querySelector('.search-result-item');
                if (firstResult) firstResult.click();
            }
        });
    },

    setupSearchToggle() {
        const toggleBtn = document.getElementById('search-toggle-btn');
        toggleBtn.onclick = (e) => {
            e.stopPropagation();
            const wrapper = document.getElementById('search-wrapper');
            const searchInput = document.getElementById('global-search');
            wrapper.classList.add('mobile-active');
            setTimeout(() => searchInput.focus(), 100);
        };
    },

    performSearch(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        // ===== 个人提升 =====
        this.data.growthNodes.forEach(node => {
            if (node.type !== 'file') return;
            const searchable = `${node.name} ${node.content || ''}`.toLowerCase();
            if (searchable.includes(lowerQuery)) {
                results.push({
                    module: 'growth', id: node.id, icon: '🌱',
                    title: node.name,
                    preview: this.getMatchPreview(node.content || '', query),
                    type: '个人提升'
                });
            }
        });

        // ===== 待办 =====
        this.data.todos.forEach(todo => {
            const searchable = `${todo.text} ${todo.category || ''} ${todo.notes || ''}`.toLowerCase();
            if (searchable.includes(lowerQuery)) {
                results.push({
                    module: 'todos', id: todo.id, icon: '✅',
                    title: todo.text,
                    preview: this.getMatchPreview(todo.notes || todo.category || '', query),
                    type: '待办'
                });
            }
        });

        // ===== 面试 =====
        this.data.interviews.forEach(item => {
            const searchable = `${item.company} ${item.position || ''} ${item.location || ''} ${item.salary || ''} ${item.notes || ''}`.toLowerCase();
            if (searchable.includes(lowerQuery)) {
                results.push({
                    module: 'interviews', id: item.id, icon: '💼',
                    title: `${item.company} - ${item.position || '未知职位'}`,
                    preview: this.getMatchPreview(`${item.location || ''} ${item.notes || ''}`, query),
                    type: '面试'
                });
            }
        });

        // ===== 个人资料 =====
        this.data.profiles.forEach(item => {
            const searchable = `${item.title} ${item.content || ''} ${item.folder || ''}`.toLowerCase();
            if (searchable.includes(lowerQuery)) {
                results.push({
                    module: 'profiles', id: item.id, icon: item.icon || '👤',
                    title: item.title,
                    preview: this.getMatchPreview(item.content || '', query),
                    type: '资料'
                });
            }
        });

        // ===== 好去处 =====
        this.data.places.forEach(item => {
            const searchable = `${item.name} ${item.address || ''} ${item.notes || ''}`.toLowerCase();
            if (searchable.includes(lowerQuery)) {
                results.push({
                    module: 'places', id: item.id, icon: '📍',
                    title: item.name,
                    preview: this.getMatchPreview(`${item.address || ''} ${item.notes || ''}`, query),
                    type: '好去处'
                });
            }
        });

        this.renderSearchResults(results, query);
    },

    getMatchPreview(text, query) {
        if (!text) return '（无内容）';
        const plainText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const lowerText = plainText.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerText.indexOf(lowerQuery);
        if (index === -1) {
            return this.escapeHtml(plainText.substring(0, 80)) + (plainText.length > 80 ? '...' : '');
        }
        const start = Math.max(0, index - 30);
        const end = Math.min(plainText.length, index + query.length + 30);
        let preview = plainText.substring(start, end);
        if (start > 0) preview = '...' + preview;
        if (end < plainText.length) preview = preview + '...';
        const escaped = this.escapeHtml(preview);
        const escapedQuery = this.escapeHtml(query);
        const regex = new RegExp(`(${this.escapeRegex(escapedQuery)})`, 'gi');
        return escaped.replace(regex, '<mark>$1</mark>');
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    renderSearchResults(results, query) {
        const searchResults = document.getElementById('search-results');
        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="search-empty">
                    <div class="empty-icon">🔍</div>
                    <div>没有找到 "${this.escapeHtml(query)}" 相关的内容</div>
                </div>`;
            searchResults.classList.add('show');
            return;
        }
        const grouped = {};
        results.forEach(r => {
            if (!grouped[r.module]) grouped[r.module] = [];
            grouped[r.module].push(r);
        });
        const moduleNames = {
            growth: '🌱 个人提升', todos: '✅ 待办', interviews: '💼 面试',
            profiles: '👤 资料', places: '📍 好去处'
        };
        let html = '';
        for (const [module, items] of Object.entries(grouped)) {
            html += `<div class="search-category">${moduleNames[module]} (${items.length})</div>`;
            items.forEach(item => {
                html += `
                    <div class="search-result-item" onclick="App.jumpToResult('${item.module}', '${item.id}')">
                        <div class="result-title">${item.icon} ${this.escapeHtml(item.title)}</div>
                        <div class="result-preview">${item.preview}</div>
                    </div>`;
            });
        }
        searchResults.innerHTML = html;
        searchResults.classList.add('show');
    },

    jumpToResult(module, id) {
        document.getElementById('search-results').classList.remove('show');
        document.getElementById('global-search').value = '';
        document.getElementById('search-clear').classList.remove('show');
        document.getElementById('search-wrapper').classList.remove('mobile-active');
        this.currentModule = module;
        document.querySelectorAll('.nav-item').forEach(n => {
            n.classList.toggle('active', n.dataset.module === module);
        });
        this.updateHeader();
    
        // ⭐ 先设置 currentId，再 render，renderGrowth 会自动初始化 Quill
        if (module === 'growth') {
            this.data.growthCurrentId = id;
            // 自动展开祖先文件夹，让树里能看到这个文件
            this.expandAncestors(id);
            this.render();
            // ❌ 删掉这里原来的 setTimeout initGrowthQuill
        } else {
            this.render();
            setTimeout(() => {
                if (module === 'todos') this.openTodoForm(id);
                else if (module === 'interviews') this.openInterviewForm(id);
                else if (module === 'profiles') this.openProfileForm(id);
                else if (module === 'places') this.openPlaceForm(id);
            }, 200);
        }
    },
    
    // ⭐ 新增：展开某个节点的所有祖先文件夹
    expandAncestors(nodeId) {
        let cur = this.data.growthNodes.find(n => n.id === nodeId);
        while (cur && cur.parentId) {
            this.data.growthExpanded[cur.parentId] = true;
            cur = this.data.growthNodes.find(n => n.id === cur.parentId);
        }
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    formatDateTime(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    },

    // ============ 时间工具（马来西亚时区） ============
    getMalaysiaNow() {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kuala_Lumpur',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        });
        const parts = formatter.formatToParts(now);
        const get = (type) => parts.find(p => p.type === type)?.value || '00';
        let hour = parseInt(get('hour'));
        if (hour === 24) hour = 0;
        return new Date(
            parseInt(get('year')),
            parseInt(get('month')) - 1,
            parseInt(get('day')),
            hour,
            parseInt(get('minute')),
            parseInt(get('second'))
        );
    },

    isMalaysiaToday(date) {
        const myNow = this.getMalaysiaNow();
        return date.getFullYear() === myNow.getFullYear() &&
               date.getMonth() === myNow.getMonth() &&
               date.getDate() === myNow.getDate();
    },

    getMalaysiaTimeParts() {
        const myNow = this.getMalaysiaNow();
        return {
            hours: myNow.getHours(),
            minutes: myNow.getMinutes(),
            totalMinutes: myNow.getHours() * 60 + myNow.getMinutes()
        };
    },

    // ============ 提醒 ============
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }
    },

    setupReminderChecker() {
        if (this.reminderInterval) clearInterval(this.reminderInterval);
        this.reminderInterval = setInterval(() => this.checkReminders(), 30000);
    },

    checkReminders() {
        const now = new Date();
        let hasNew = false;
        this.data.todos.forEach(todo => {
            if (todo.completed || !todo.reminder) return;
            if (new Date(todo.reminder) <= now && !this.notifiedReminders.has(todo.id)) {
                this.notifiedReminders.add(todo.id);
                hasNew = true;
                this.triggerReminder(todo);
            }
        });
        if (hasNew) this.render();
    },

    triggerReminder(todo) {
        this.showToast(`⏰ 提醒: ${todo.text}`, 'warning');
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('待办事项提醒', { body: todo.text, tag: todo.id, requireInteraction: true });
            } catch (e) {}
        }
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    },

    // =========================================================
    // ============ 个人提升模块（替代原康奈尔笔记） ============
    // =========================================================

    renderGrowth(area) {
        area.innerHTML = `
            <div class="growth-layout">
                <div class="growth-sidebar" id="growth-sidebar">
                    <div class="growth-sidebar-header">
                        <button class="growth-add-root-btn" onclick="App.openGrowthForm(null, 'folder')">📁 文件夹</button>
                        <button class="growth-add-root-btn" onclick="App.openGrowthForm(null, 'file')">📄 文件</button>
                    </div>
                    <div class="growth-tree" id="growth-tree">
                        ${this.renderGrowthTree(null, 0)}
                    </div>
                </div>
                <div class="growth-content" id="growth-content">
                    ${this.renderGrowthContent()}
                </div>
            </div>
        `;
        // 若当前有打开的文件，重新初始化 Quill
        if (this.data.growthCurrentId) {
            const node = this.data.growthNodes.find(n => n.id === this.data.growthCurrentId);
            if (node && node.type === 'file') {
                setTimeout(() => this.initGrowthQuill(node), 30);
            }
        }
    },

    renderGrowthTree(parentId, depth) {
        const nodes = this.data.growthNodes
            .filter(n => n.parentId === parentId)
            .sort((a, b) => {
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return a.sortOrder - b.sortOrder;
            });

        if (nodes.length === 0 && depth === 0) {
            return `<div class="growth-empty-tree">还没有内容<br>点击上方按钮创建</div>`;
        }

        return nodes.map(node => {
            const isFolder = node.type === 'folder';
            const isExpanded = !!this.data.growthExpanded[node.id];
            const isActive = this.data.growthCurrentId === node.id;

            let html = `
                <div class="growth-tree-item ${isActive ? 'active' : ''} ${isFolder ? 'folder' : 'file'}"
                     style="padding-left: ${12 + depth * 16}px;"
                     onclick="App.onGrowthItemClick('${node.id}', '${node.type}')">
                    ${isFolder
                        ? `<span class="growth-caret ${isExpanded ? 'expanded' : ''}"
                                onclick="event.stopPropagation(); App.toggleGrowthExpand('${node.id}')">▶</span>`
                        : `<span class="growth-caret-placeholder"></span>`}
                    <span class="growth-item-icon">${isFolder ? (isExpanded ? '📂' : '📁') : '📄'}</span>
                    <span class="growth-item-name">${this.escapeHtml(node.name)}</span>
                    <span class="growth-item-actions">
                        ${isFolder ? `<button class="growth-mini-btn" title="新建子项"
                            onclick="event.stopPropagation(); App.openGrowthForm('${node.id}')">＋</button>` : ''}
                        <button class="growth-mini-btn" title="重命名"
                            onclick="event.stopPropagation(); App.renameGrowthNode('${node.id}')">✏️</button>
                        <button class="growth-mini-btn danger" title="删除"
                            onclick="event.stopPropagation(); App.deleteGrowthNode('${node.id}')">🗑️</button>
                    </span>
                </div>
            `;

            if (isFolder && isExpanded) {
                html += `<div class="growth-tree-children">${this.renderGrowthTree(node.id, depth + 1)}</div>`;
            }
            return html;
        }).join('');
    },

    renderGrowthContent() {
        const currentId = this.data.growthCurrentId;
        if (!currentId) {
            return `<div class="growth-empty-state">
                <div class="empty-icon">🌱</div>
                <h3>选择一个文件开始编辑</h3>
                <p>或从左侧创建新的文件夹 / 文件</p>
            </div>`;
        }
        const node = this.data.growthNodes.find(n => n.id === currentId);
        if (!node) {
            return `<div class="growth-empty-state">
                <div class="empty-icon">📄</div>
                <h3>文件不存在</h3>
            </div>`;
        }
        if (node.type === 'folder') {
            return `<div class="growth-empty-state">
                <div class="empty-icon">📁</div>
                <h3>这是一个文件夹</h3>
                <p>文件夹不能编辑内容，请选择文件</p>
            </div>`;
        }

        return `
            <div class="growth-editor-header">
                <input type="text" class="growth-title-input" id="growth-title-input"
                       value="${this.escapeHtml(node.name)}"
                       onchange="App.renameGrowthNodeInline('${node.id}', this.value)"
                       placeholder="无标题">
                <div class="growth-editor-meta">
                    <span>🕐 更新于 ${this.formatDate(node.updatedAt)}</span>
                </div>
            </div>
            <div class="growth-editor-body">
                <div id="growth-quill-editor"></div>
            </div>
        `;
    },

    onGrowthItemClick(id, type) {
        const node = this.data.growthNodes.find(n => n.id === id);
        if (!node) return;
        if (type === 'folder') {
            this.toggleGrowthExpand(id);
        } else {
            this.data.growthCurrentId = id;
            // 只刷新右侧，避免 Quill 被销毁
            const content = document.getElementById('growth-content');
            if (content) {
                content.innerHTML = this.renderGrowthContent();
                setTimeout(() => this.initGrowthQuill(node), 30);
            } else {
                this.render();
            }
            // 更新左侧高亮
            const tree = document.getElementById('growth-tree');
            if (tree) tree.innerHTML = this.renderGrowthTree(null, 0);
        }
    },

    toggleGrowthExpand(id) {
        this.data.growthExpanded[id] = !this.data.growthExpanded[id];
        const tree = document.getElementById('growth-tree');
        if (tree) tree.innerHTML = this.renderGrowthTree(null, 0);
    },

    initGrowthQuill(node) {
        const editorEl = document.getElementById('growth-quill-editor');
        if (!editorEl) return;

        const imageHandler = function() {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.click();
            input.onchange = async () => {
                const file = input.files[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                    App.showToast('图片太大，最大 5MB', 'error');
                    return;
                }
                try {
                    const processedFile = await App.compressImage(file, 1200, 0.85);
                    const formData = new FormData();
                    formData.append('file', processedFile);
                    const response = await fetch('api.php?action=upload_file', { method: 'POST', body: formData });
                    const result = await response.json();
                    if (result.success) {
                        const quill = this.quill;
                        const range = quill.getSelection(true);
                        quill.insertEmbed(range.index, 'image', result.file_path);
                        quill.setSelection(range.index + 1);
                    } else {
                        App.showToast('图片上传失败: ' + (result.error || ''), 'error');
                    }
                } catch (error) {
                    App.showToast('图片处理失败: ' + error.message, 'error');
                }
            };
        };

        const quill = new Quill('#growth-quill-editor', {
            theme: 'snow',
            placeholder: '开始记录你的成长...',
            modules: {
                toolbar: {
                    container: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['blockquote', 'code-block'],
                        ['link', 'image'],
                        ['clean']
                    ],
                    handlers: { 'image': imageHandler }
                }
            }
        });
        quill.root.innerHTML = node.content || '';
        this.growthQuill = quill;

        let saveTimer;
        quill.on('text-change', () => {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => this.autoSaveGrowth(), 800);
        });
    },

    async autoSaveGrowth() {
        if (!this.growthQuill || !this.data.growthCurrentId) return;
        const node = this.data.growthNodes.find(n => n.id === this.data.growthCurrentId);
        if (!node) return;
        const content = this.growthQuill.root.innerHTML;
        try {
            await API.saveGrowthNode({
                name: node.name,
                type: node.type,
                content: content,
                parent_id: node.parentId,
                sort_order: node.sortOrder
            }, node.id);
            node.content = content;
            node.updatedAt = new Date().toISOString();
        } catch (e) {
            console.error('自动保存失败', e);
        }
    },

    openGrowthForm(parentId = null, defaultType = 'file') {
        const parent = parentId ? this.data.growthNodes.find(n => n.id === parentId) : null;
        const parentName = parent ? parent.name : '根目录';

        this.openModal(`<h2>新建${defaultType === 'folder' ? '文件夹' : '文件'}</h2>
            <div class="form-group">
                <label>父级位置</label>
                <input type="text" value="${this.escapeHtml(parentName)}" disabled style="background:#f5f5f7;color:var(--text-muted);">
            </div>
            <div class="form-group">
                <label>类型</label>
                <select id="growth-type">
                    <option value="folder" ${defaultType === 'folder' ? 'selected' : ''}>📁 文件夹</option>
                    <option value="file" ${defaultType === 'file' ? 'selected' : ''}>📄 文件</option>
                </select>
            </div>
            <div class="form-group">
                <label>名称 *</label>
                <input type="text" id="growth-name" placeholder="输入名称...">
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
                <button class="btn btn-primary" onclick="App.saveGrowthNode('${parentId || ''}')">创建</button>
            </div>`);

        setTimeout(() => {
            const el = document.getElementById('growth-name');
            if (el) el.focus();
        }, 50);
    },

    async saveGrowthNode(parentId) {
        const name = document.getElementById('growth-name').value.trim();
        const type = document.getElementById('growth-type').value;
        if (!name) { this.showToast('请输入名称', 'error'); return; }
        try {
            const res = await API.saveGrowthNode({
                name, type, content: '', parent_id: parentId || null
            });
            this.showToast(type === 'folder' ? '文件夹已创建' : '文件已创建', 'success');
            this.closeModal();
            await this.loadAllData();
            if (parentId) this.data.growthExpanded[parentId] = true;
            if (type === 'file') this.data.growthCurrentId = res.id;
            this.render();
        } catch (e) { this.showToast('创建失败: ' + e.message, 'error'); }
    },

    renameGrowthNode(id) {
        const node = this.data.growthNodes.find(n => n.id === id);
        if (!node) return;
        const newName = prompt('重命名', node.name);
        if (newName === null || !newName.trim()) return;
        this.renameGrowthNodeInline(id, newName.trim());
    },

    async renameGrowthNodeInline(id, newName) {
        const node = this.data.growthNodes.find(n => n.id === id);
        if (!node || !newName || !newName.trim()) return;
        const trimmed = newName.trim();
        if (trimmed === node.name) return;
        try {
            await API.saveGrowthNode({
                name: trimmed,
                type: node.type,
                content: node.content,
                parent_id: node.parentId,
                sort_order: node.sortOrder
            }, id);
            node.name = trimmed;
            const tree = document.getElementById('growth-tree');
            if (tree) tree.innerHTML = this.renderGrowthTree(null, 0);
            this.showToast('已重命名', 'success');
        } catch (e) {
            this.showToast('重命名失败', 'error');
            // 回滚 UI
            const input = document.getElementById('growth-title-input');
            if (input) input.value = node.name;
        }
    },

    async deleteGrowthNode(id) {
        const node = this.data.growthNodes.find(n => n.id === id);
        if (!node) return;
        const hasChildren = this.data.growthNodes.some(n => n.parentId === id);
        const msg = hasChildren
            ? `「${node.name}」包含子项，删除后全部消失，确定吗？`
            : `确定删除「${node.name}」吗？`;
        if (!confirm(msg)) return;
        try {
            await API.deleteGrowthNode(id);
            if (this.data.growthCurrentId === id) this.data.growthCurrentId = null;
            this.showToast('已删除', 'info');
            await this.loadAllData();
            this.render();
        } catch (e) { this.showToast('删除失败', 'error'); }
    },

    // ============ 图片压缩工具 ============
    compressImage(file, maxWidth = 1200, quality = 0.85) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let { width, height } = img;
                    if (width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const isPng = file.type === 'image/png';
                    const outputType = isPng ? 'image/png' : 'image/jpeg';

                    canvas.toBlob((blob) => {
                        const ext = isPng ? 'png' : 'jpg';
                        const newName = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
                        resolve(new File([blob], newName, { type: outputType }));
                    }, outputType, isPng ? undefined : quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },

    // ============ 待办渲染 ============
    renderTodos(area) {
        const view = this.data.todoView || 'list';

        const viewToggle = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="todo-filter-btn ${view === 'calendar' ? 'active' : ''}" onclick="App.setTodoView('calendar')">📅 月历</button>
                    <button class="todo-filter-btn ${view === 'schedule' ? 'active' : ''}" onclick="App.setTodoView('schedule')">📆 日程</button>
                    <button class="todo-filter-btn ${view === 'list' ? 'active' : ''}" onclick="App.setTodoView('list')">📋 列表</button>
                </div>
            </div>
        `;

        if (view === 'calendar') {
            area.innerHTML = viewToggle + this.renderCalendarView();
        } else if (view === 'schedule') {
            area.innerHTML = viewToggle + this.renderScheduleView();
        } else {
            area.innerHTML = viewToggle + this.renderListView();
        }
    },

    setTodoView(view) {
        this.data.todoView = view;
        this.render();
        if (view === 'schedule') {
            setTimeout(() => this.scrollToNowLine(), 200);
        }
    },

    scrollToNowLine() {
        const line = document.getElementById('schedule-now-line')
                  || document.getElementById('schedule-now-line-week');
        if (!line) return;

        const rect = line.getBoundingClientRect();
        const scrollContainer = document.querySelector('.content-area');

        if (scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const lineOffsetInContainer = rect.top - containerRect.top + scrollContainer.scrollTop;
            const targetScroll = lineOffsetInContainer - containerRect.height / 2;

            scrollContainer.scrollTo({
                top: Math.max(0, targetScroll),
                behavior: 'smooth'
            });
        }
    },

    // ============ 列表视图 ============
    renderListView() {
        const todos = this.data.todos;
        const filter = this.data.todoFilter || 'all';
        const categoryFilter = this.data.categoryFilter || 'all';

        let filteredTodos = todos;
        if (filter === 'notstarted') filteredTodos = todos.filter(t => !t.completed && (t.progress === 'notstarted' || !t.progress));
        else if (filter === 'inprogress') filteredTodos = todos.filter(t => !t.completed && t.progress === 'inprogress');
        else if (filter === 'completed') filteredTodos = todos.filter(t => t.completed || t.progress === 'completed');

        if (categoryFilter === '无分类') {
            filteredTodos = filteredTodos.filter(t => !t.category || t.category === '');
        } else if (categoryFilter !== 'all') {
            filteredTodos = filteredTodos.filter(t => t.category === categoryFilter);
        }

        filteredTodos = [...filteredTodos].sort((a, b) => {
            const getOrder = (t) => {
                if (t.completed || t.progress === 'completed') return 2;
                if (t.progress === 'inprogress') return 0;
                return 1;
            };

            const orderA = getOrder(a);
            const orderB = getOrder(b);

            if (orderA !== orderB) return orderA - orderB;

            const getDate = (t) => {
                const d = t.reminder || t.dueDate;
                return d ? new Date(d).getTime() : 0;
            };

            const dateA = getDate(a);
            const dateB = getDate(b);

            if (orderA === 2) {
                return dateB - dateA;
            }
            return dateA - dateB;
        });

        const filterLabels = {
            all: '全部', notstarted: '未开始', inprogress: '进行中', completed: '已完成'
        };
        const categoryLabels = {
            all: '全部分类', '工作': '💼 工作', '生活': '🏠 生活', '学习': '📚 学习', '无分类': '📌 无分类'
        };

        const desktopFiltersHtml = `
            <div class="todo-filters desktop-only">
                <button class="todo-filter-btn ${filter === 'all' ? 'active' : ''}" onclick="App.setTodoFilter('all')">全部 (${todos.length})</button>
                <button class="todo-filter-btn ${filter === 'notstarted' ? 'active' : ''}" onclick="App.setTodoFilter('notstarted')">未开始 (${todos.filter(t => !t.completed && (t.progress === 'notstarted' || !t.progress)).length})</button>
                <button class="todo-filter-btn ${filter === 'inprogress' ? 'active' : ''}" onclick="App.setTodoFilter('inprogress')">进行中 (${todos.filter(t => !t.completed && t.progress === 'inprogress').length})</button>
                <button class="todo-filter-btn ${filter === 'completed' ? 'active' : ''}" onclick="App.setTodoFilter('completed')">已完成 (${todos.filter(t => t.completed || t.progress === 'completed').length})</button>
            </div>
            <div class="todo-filters desktop-only" style="margin-top:-8px;">
                <button class="todo-filter-btn ${categoryFilter === 'all' ? 'active' : ''}" onclick="App.setCategoryFilter('all')">📂 全部分类</button>
                <button class="todo-filter-btn ${categoryFilter === '工作' ? 'active' : ''}" onclick="App.setCategoryFilter('工作')">💼 工作 (${todos.filter(t => t.category === '工作').length})</button>
                <button class="todo-filter-btn ${categoryFilter === '生活' ? 'active' : ''}" onclick="App.setCategoryFilter('生活')">🏠 生活 (${todos.filter(t => t.category === '生活').length})</button>
                <button class="todo-filter-btn ${categoryFilter === '学习' ? 'active' : ''}" onclick="App.setCategoryFilter('学习')">📚 学习 (${todos.filter(t => t.category === '学习').length})</button>
                <button class="todo-filter-btn ${categoryFilter === '无分类' ? 'active' : ''}" onclick="App.setCategoryFilter('无分类')">📌 无分类 (${todos.filter(t => !t.category || t.category === '').length})</button>
            </div>
        `;

        const mobileFiltersHtml = `
            <div class="mobile-filter-bar">
                <div class="mobile-filter-dropdown" id="statusDropdown">
                    <button class="mobile-filter-btn" onclick="App.toggleMobileDropdown('statusDropdown')">
                        <span class="mobile-filter-label">状态</span>
                        <span class="mobile-filter-value">${filterLabels[filter] || '全部'}</span>
                        <span class="mobile-filter-arrow">▼</span>
                    </button>
                    <div class="mobile-filter-options">
                        <div class="mobile-filter-option ${filter === 'all' ? 'active' : ''}" onclick="App.setTodoFilter('all');App.closeMobileDropdowns()">全部 (${todos.length})</div>
                        <div class="mobile-filter-option ${filter === 'notstarted' ? 'active' : ''}" onclick="App.setTodoFilter('notstarted');App.closeMobileDropdowns()">未开始 (${todos.filter(t => !t.completed && (t.progress === 'notstarted' || !t.progress)).length})</div>
                        <div class="mobile-filter-option ${filter === 'inprogress' ? 'active' : ''}" onclick="App.setTodoFilter('inprogress');App.closeMobileDropdowns()">进行中 (${todos.filter(t => !t.completed && t.progress === 'inprogress').length})</div>
                        <div class="mobile-filter-option ${filter === 'completed' ? 'active' : ''}" onclick="App.setTodoFilter('completed');App.closeMobileDropdowns()">已完成 (${todos.filter(t => t.completed || t.progress === 'completed').length})</div>
                    </div>
                </div>
                <div class="mobile-filter-dropdown" id="categoryDropdown">
                    <button class="mobile-filter-btn" onclick="App.toggleMobileDropdown('categoryDropdown')">
                        <span class="mobile-filter-label">分类</span>
                        <span class="mobile-filter-value">${categoryLabels[categoryFilter] || '全部分类'}</span>
                        <span class="mobile-filter-arrow">▼</span>
                    </button>
                    <div class="mobile-filter-options">
                        <div class="mobile-filter-option ${categoryFilter === 'all' ? 'active' : ''}" onclick="App.setCategoryFilter('all');App.closeMobileDropdowns()">📂 全部分类</div>
                        <div class="mobile-filter-option ${categoryFilter === '工作' ? 'active' : ''}" onclick="App.setCategoryFilter('工作');App.closeMobileDropdowns()">💼 工作 (${todos.filter(t => t.category === '工作').length})</div>
                        <div class="mobile-filter-option ${categoryFilter === '生活' ? 'active' : ''}" onclick="App.setCategoryFilter('生活');App.closeMobileDropdowns()">🏠 生活 (${todos.filter(t => t.category === '生活').length})</div>
                        <div class="mobile-filter-option ${categoryFilter === '学习' ? 'active' : ''}" onclick="App.setCategoryFilter('学习');App.closeMobileDropdowns()">📚 学习 (${todos.filter(t => t.category === '学习').length})</div>
                        <div class="mobile-filter-option ${categoryFilter === '无分类' ? 'active' : ''}" onclick="App.setCategoryFilter('无分类');App.closeMobileDropdowns()">📌 无分类 (${todos.filter(t => !t.category || t.category === '').length})</div>
                    </div>
                </div>
            </div>
        `;

        const filtersHtml = desktopFiltersHtml + mobileFiltersHtml;

        if (filteredTodos.length === 0) {
            return `${filtersHtml}<div class="empty-state"><div class="empty-icon">✅</div><h3>没有待办事项</h3><p>添加一个待办事项开始高效工作！</p></div>`;
        }

        const renderItem = (todo) => {
            const pn = { high: '高', medium: '中', low: '低' };
            const rs = todo.reminder ? `⏰ ${this.formatDateTime(todo.reminder)}` : '';
            const ds = todo.dueDate ? `📅 ${this.formatDate(todo.dueDate)}` : '';

            let categoryTag = '';
            if (todo.category === '工作') categoryTag = `<span class="tag tag-blue">💼 工作</span>`;
            else if (todo.category === '生活') categoryTag = `<span class="tag tag-green">🏠 生活</span>`;
            else if (todo.category === '学习') categoryTag = `<span class="tag tag-purple">📚 学习</span>`;
            else if (todo.category) categoryTag = `<span class="tag tag-gray">${todo.category}</span>`;

            let progressTag = '', progressColor = 'tag-gray';
            if (todo.completed || todo.progress === 'completed') { progressTag = '✅ 已完成'; progressColor = 'tag-green'; }
            else if (todo.progress === 'inprogress') { progressTag = '🔄 进行中'; progressColor = 'tag-orange'; }
            else { progressTag = '⏳ 未开始'; progressColor = 'tag-gray'; }

            const calendarBtn = (todo.reminder || todo.dueDate)
                ? `<button class="btn btn-sm btn-secondary" onclick="App.addToGoogleCalendar('${todo.id}')" title="加入Google日历">📅</button>`
                : '';

            return `<div class="todo-item">
                <div class="todo-priority priority-${todo.priority || 'medium'}"></div>
                <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" onclick="App.toggleTodo('${todo.id}')">${todo.completed ? '✓' : ''}</div>
                <div class="todo-content">
                    <div class="todo-text ${todo.completed ? 'completed' : ''}">${this.escapeHtml(todo.text)}</div>
                    <div class="todo-details">${categoryTag}<span class="tag ${progressColor}">${progressTag}</span>${rs ? `<span>${rs}</span>` : ''}${ds ? `<span>${ds}</span>` : ''}<span>优先级: ${pn[todo.priority] || '中'}</span></div>
                </div>
                <div class="todo-actions">
                    ${calendarBtn}
                    <button class="btn btn-sm btn-secondary" onclick="App.setTodoProgress('${todo.id}', 'notstarted')" title="设为未开始">⏳</button>
                    <button class="btn btn-sm btn-secondary" onclick="App.setTodoProgress('${todo.id}', 'inprogress')" title="设为进行中">🔄</button>
                    <button class="btn btn-sm btn-secondary" onclick="App.setTodoProgress('${todo.id}', 'completed')" title="设为已完成">✅</button>
                    <button class="btn btn-sm btn-secondary" onclick="App.openTodoForm('${todo.id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="App.deleteTodo('${todo.id}')">🗑️</button>
                </div>
            </div>`;
        };

        return `${filtersHtml}<div class="todo-list">${filteredTodos.map(renderItem).join('')}</div>`;
    },

    setCategoryFilter(category) {
        this.data.categoryFilter = category;
        this.render();
    },

    toggleMobileDropdown(dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        const isOpen = dropdown.classList.contains('open');
        document.querySelectorAll('.mobile-filter-dropdown').forEach(d => d.classList.remove('open'));
        if (!isOpen) dropdown.classList.add('open');
    },

    closeMobileDropdowns() {
        document.querySelectorAll('.mobile-filter-dropdown').forEach(d => d.classList.remove('open'));
    },

    setTodoFilter(filter) {
        this.data.todoFilter = filter;
        this.render();
    },

    // ============ 日历视图 ============
    renderCalendarView() {
        const currentDate = this.data.calendarDate || new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startWeekday = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        const prevLastDay = new Date(year, month, 0).getDate();

        const todosByDate = {};
        this.data.todos.forEach(todo => {
            const dateStr = todo.reminder || todo.dueDate;
            if (!dateStr) return;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return;
            if (d.getFullYear() === year && d.getMonth() === month) {
                const day = d.getDate();
                if (!todosByDate[day]) todosByDate[day] = [];
                todosByDate[day].push(todo);
            }
        });

        const interviewsByDate = {};
        this.data.interviews.forEach(item => {
            if (!item.interviewDate) return;
            const d = new Date(item.interviewDate);
            if (isNaN(d.getTime())) return;
            if (d.getFullYear() === year && d.getMonth() === month) {
                const day = d.getDate();
                if (!interviewsByDate[day]) interviewsByDate[day] = [];
                interviewsByDate[day].push(item);
            }
        });

        let daysHtml = '';

        for (let i = startWeekday - 1; i >= 0; i--) {
            const day = prevLastDay - i;
            daysHtml += `<div class="calendar-day other-month"><div class="calendar-day-num">${day}</div></div>`;
        }

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

        for (let day = 1; day <= daysInMonth; day++) {
            const dayTodos = todosByDate[day] || [];
            const dayInterviews = interviewsByDate[day] || [];
            const isToday = isCurrentMonth && today.getDate() === day;
            const isWeekend = (startWeekday + day - 1) % 7 === 0 || (startWeekday + day - 1) % 7 === 6;

            let dayClass = 'calendar-day';
            if (isToday) dayClass += ' today';
            if (isWeekend) dayClass += ' weekend';
            if (dayTodos.length > 0 || dayInterviews.length > 0) dayClass += ' has-tasks';

            const allItems = [];
            dayInterviews.slice(0, 2).forEach(iv => {
                allItems.push({
                    type: 'interview', icon: '💼',
                    text: `${iv.company}`, color: '#9333ea', item: iv
                });
            });

            const remainingSlots = Math.max(0, 3 - allItems.length);
            dayTodos.slice(0, remainingSlots).forEach(t => {
                let dotColor = 'var(--primary)';
                if (t.completed || t.progress === 'completed') dotColor = 'var(--success)';
                else if (t.priority === 'high') dotColor = 'var(--danger)';
                else if (t.priority === 'medium') dotColor = 'var(--warning)';
                allItems.push({
                    type: 'todo', icon: '', text: t.text, color: dotColor, item: t
                });
            });

            const totalItems = dayTodos.length + dayInterviews.length;
            const moreCount = totalItems - allItems.length;

            daysHtml += `
                <div class="${dayClass}" onclick="App.showDayTasks(${year}, ${month}, ${day})">
                    <div class="calendar-day-num">${day}</div>
                    <div class="calendar-day-tasks">
                        ${allItems.map(item => `
                            <div class="calendar-task-item" title="${this.escapeHtml(item.text)}">
                                ${item.type === 'interview'
                                    ? `<span style="font-size:9px;">💼</span>`
                                    : `<span class="calendar-dot" style="background:${item.color};"></span>`}
                                <span class="calendar-task-text">${this.escapeHtml(item.text.substring(0, 15))}${item.text.length > 15 ? '...' : ''}</span>
                            </div>
                        `).join('')}
                        ${moreCount > 0 ? `<div class="calendar-more">+${moreCount} 更多</div>` : ''}
                    </div>
                </div>
            `;
        }

        const totalCells = startWeekday + daysInMonth;
        const remainingCells = (7 - (totalCells % 7)) % 7;
        for (let day = 1; day <= remainingCells; day++) {
            daysHtml += `<div class="calendar-day other-month"><div class="calendar-day-num">${day}</div></div>`;
        }

        return `
            <div class="calendar-container">
                <div class="calendar-header">
                    <button class="calendar-nav-btn" onclick="App.calendarPrevMonth()">◀</button>
                    <div class="calendar-title">${year}年 ${monthNames[month]}</div>
                    <button class="calendar-nav-btn" onclick="App.calendarNextMonth()">▶</button>
                    <button class="calendar-today-btn" onclick="App.calendarToday()">今天</button>
                </div>
                <div class="calendar-weekdays">
                    <div class="calendar-weekday weekend">日</div>
                    <div class="calendar-weekday">一</div>
                    <div class="calendar-weekday">二</div>
                    <div class="calendar-weekday">三</div>
                    <div class="calendar-weekday">四</div>
                    <div class="calendar-weekday">五</div>
                    <div class="calendar-weekday weekend">六</div>
                </div>
                <div class="calendar-grid">
                    ${daysHtml}
                </div>
                <div class="calendar-legend">
                    <span><span class="calendar-dot" style="background:#9333ea;"></span> 面试</span>
                    <span><span class="calendar-dot" style="background:var(--danger);"></span> 高优先级</span>
                    <span><span class="calendar-dot" style="background:var(--warning);"></span> 中优先级</span>
                    <span><span class="calendar-dot" style="background:var(--primary);"></span> 低优先级</span>
                    <span><span class="calendar-dot" style="background:var(--success);"></span> 已完成</span>
                </div>
            </div>
        `;
    },

    calendarPrevMonth() {
        const d = this.data.calendarDate || new Date();
        this.data.calendarDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
        this.render();
    },

    calendarNextMonth() {
        const d = this.data.calendarDate || new Date();
        this.data.calendarDate = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        this.render();
    },

    calendarToday() {
        this.data.calendarDate = new Date();
        this.render();
    },

    // ============ 日程视图 ============
    renderScheduleView() {
        const mode = this.data.scheduleMode || 'day';
        const currentDate = this.data.scheduleDate || new Date();

        const toolbar = `
            <div class="schedule-toolbar">
                <div class="schedule-toolbar-left">
                    <button class="schedule-nav-btn" onclick="App.schedulePrev()">◀</button>
                    <button class="schedule-today-btn" onclick="App.scheduleToday()">今天</button>
                    <button class="schedule-nav-btn" onclick="App.scheduleNext()">▶</button>
                    <div class="schedule-title">${this.getScheduleTitle(mode, currentDate)}</div>
                </div>
                <div class="schedule-toolbar-right">
                    <button class="todo-filter-btn ${mode === 'day' ? 'active' : ''}" onclick="App.setScheduleMode('day')">日</button>
                    <button class="todo-filter-btn ${mode === 'week' ? 'active' : ''}" onclick="App.setScheduleMode('week')">周</button>
                </div>
            </div>
        `;

        let contentHtml;
        if (mode === 'day') {
            contentHtml = this.renderDayView(currentDate);
        } else {
            contentHtml = this.renderWeekView(currentDate);
        }

        return toolbar + contentHtml;
    },

    getScheduleTitle(mode, date) {
        if (mode === 'day') {
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
            });
        } else {
            const start = this.getWeekStart(date);
            const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
            if (start.getMonth() === end.getMonth()) {
                return `${start.getFullYear()}年 ${start.getMonth() + 1}月 ${start.getDate()} - ${end.getDate()}日`;
            } else {
                return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
            }
        }
    },

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    setScheduleMode(mode) {
        this.data.scheduleMode = mode;
        this.render();
        setTimeout(() => this.scrollToNowLine(), 200);
    },

    schedulePrev() {
        const mode = this.data.scheduleMode || 'day';
        const d = this.data.scheduleDate || new Date();
        if (mode === 'day') {
            this.data.scheduleDate = new Date(d.getTime() - 24 * 60 * 60 * 1000);
        } else {
            this.data.scheduleDate = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        this.render();
        setTimeout(() => this.scrollToNowLine(), 200);
    },

    scheduleNext() {
        const mode = this.data.scheduleMode || 'day';
        const d = this.data.scheduleDate || new Date();
        if (mode === 'day') {
            this.data.scheduleDate = new Date(d.getTime() + 24 * 60 * 60 * 1000);
        } else {
            this.data.scheduleDate = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
        this.render();
        setTimeout(() => this.scrollToNowLine(), 200);
    },

    scheduleToday() {
        this.data.scheduleDate = new Date();
        this.render();
        setTimeout(() => this.scrollToNowLine(), 200);
    },

    renderDayView(date) {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const dayTodos = this.data.todos.filter(todo => {
            const d = todo.reminder || todo.dueDate;
            if (!d) return false;
            const td = new Date(d);
            return td >= dayStart && td < dayEnd;
        });

        const todosByHour = {};
        dayTodos.forEach(todo => {
            const d = new Date(todo.reminder || todo.dueDate);
            const hour = d.getHours();
            if (!todosByHour[hour]) todosByHour[hour] = [];
            todosByHour[hour].push(todo);
        });

        Object.keys(todosByHour).forEach(hour => {
            todosByHour[hour].sort((a, b) => {
                const ta = new Date(a.reminder || a.dueDate);
                const tb = new Date(b.reminder || b.dueDate);
                return ta - tb;
            });
        });

        const isMyToday = this.isMalaysiaToday(dayStart);
        const { hours: nowHour, minutes: nowMinute } = this.getMalaysiaTimeParts();

        let html = `<div class="schedule-day-container" id="schedule-day-container">`;

        hours.forEach(hour => {
            const hourTodos = todosByHour[hour] || [];
            const isCurrentHour = isMyToday && hour === nowHour;

            const tasksHtml = hourTodos.map(todo => {
                const d = new Date(todo.reminder || todo.dueDate);
                const timeStr = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                return this.renderScheduleEvent(todo, false, timeStr);
            }).join('');

            html += `
                <div class="schedule-hour-row ${isCurrentHour ? 'current' : ''}" data-hour="${hour}">
                    <div class="schedule-hour-label">${String(hour).padStart(2, '0')}:00</div>
                    <div class="schedule-hour-content" onclick="App.scheduleQuickAdd(${date.getFullYear()}, ${date.getMonth()}, ${date.getDate()}, ${hour})">
                        ${tasksHtml}
                    </div>
                </div>
            `;
        });

        if (isMyToday) {
            html += `<div class="schedule-now-line-day" id="schedule-now-line" style="display:none;">
                <div class="schedule-now-dot"></div>
                <div class="schedule-now-label">${String(nowHour).padStart(2, '0')}:${String(nowMinute).padStart(2, '0')}</div>
            </div>`;
        }

        html += `</div>`;

        if (isMyToday) {
            setTimeout(() => this.positionNowLine(), 80);
        }

        return html;
    },

    positionNowLine() {
        const container = document.getElementById('schedule-day-container');
        const line = document.getElementById('schedule-now-line');
        if (!container || !line) return;

        const { hours: nowHour, minutes: nowMinute } = this.getMalaysiaTimeParts();
        const currentRow = container.querySelector(`[data-hour="${nowHour}"]`);
        const nextRow = container.querySelector(`[data-hour="${nowHour + 1}"]`);
        if (!currentRow) return;

        const containerRect = container.getBoundingClientRect();
        const rowRect = currentRow.getBoundingClientRect();

        let rowHeight = rowRect.height;
        if (nextRow) {
            const nextRect = nextRow.getBoundingClientRect();
            rowHeight = nextRect.top - rowRect.top;
        }

        const rowTopInContainer = rowRect.top - containerRect.top;
        const redLineTop = rowTopInContainer + (nowMinute / 60) * rowHeight;

        line.style.top = redLineTop + 'px';
        line.style.display = 'block';
    },

    renderWeekView(date) {
        const weekStart = this.getWeekStart(date);
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
            return d;
        });

        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const hours = Array.from({ length: 24 }, (_, i) => i);

        const { totalMinutes } = this.getMalaysiaTimeParts();

        let headerHtml = `<div class="schedule-week-header">`;
        headerHtml += `<div class="schedule-week-time-col"></div>`;
        days.forEach(d => {
            const isToday = this.isMalaysiaToday(d);
            headerHtml += `
                <div class="schedule-week-day-header ${isToday ? 'today' : ''}">
                    <div class="schedule-week-day-name">${dayNames[d.getDay()]}</div>
                    <div class="schedule-week-day-num">${d.getDate()}</div>
                </div>
            `;
        });
        headerHtml += `</div>`;

        const ROW_HEIGHT = 50;
        let bodyHtml = `<div class="schedule-week-body" id="schedule-week-body">`;
        hours.forEach(hour => {
            bodyHtml += `<div class="schedule-week-row" data-hour="${hour}" style="min-height:${ROW_HEIGHT}px;">`;
            bodyHtml += `<div class="schedule-week-time-col">${String(hour).padStart(2, '0')}:00</div>`;

            days.forEach(d => {
                const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

                const cellTodos = this.data.todos.filter(todo => {
                    const dt = todo.reminder || todo.dueDate;
                    if (!dt) return false;
                    const td = new Date(dt);
                    return td >= dayStart && td < dayEnd && td.getHours() === hour;
                });

                bodyHtml += `
                    <div class="schedule-week-cell" onclick="App.scheduleQuickAdd(${d.getFullYear()}, ${d.getMonth()}, ${d.getDate()}, ${hour})">
                        ${cellTodos.map(todo => this.renderScheduleEvent(todo, true)).join('')}
                    </div>
                `;
            });

            bodyHtml += `</div>`;
        });

        const todayIndex = days.findIndex(d => this.isMalaysiaToday(d));
        if (todayIndex !== -1) {
            const redLineTop = (totalMinutes / 60) * ROW_HEIGHT;
            bodyHtml += `
                <div class="schedule-now-line-week" id="schedule-now-line-week"
                     style="top: ${redLineTop}px; --col-index: ${todayIndex};">
                    <div class="schedule-now-dot"></div>
                </div>
            `;
        }

        bodyHtml += `</div>`;

        return `<div class="schedule-week-wrapper" style="position:relative;">
            ${headerHtml}${bodyHtml}
        </div>`;
    },

    renderScheduleEvent(todo, compact = false, customTimeStr = null) {
        const start = new Date(todo.reminder || todo.dueDate);
        const end = todo.endTime ? new Date(todo.endTime) : null;

        const startStr = customTimeStr || start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const endStr = end ? end.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';
        const timeStr = endStr ? `${startStr} - ${endStr}` : startStr;

        let color = 'var(--primary)';
        if (todo.completed || todo.progress === 'completed') color = 'var(--success)';
        else if (todo.priority === 'high') color = 'var(--danger)';
        else if (todo.priority === 'medium') color = 'var(--warning)';

        const isCompleted = todo.completed || todo.progress === 'completed';

        const calendarBtn = (todo.reminder || todo.dueDate)
            ? `<button class="event-action-btn" onclick="event.stopPropagation(); App.addToGoogleCalendar('${todo.id}')" title="加入Google日历">📅</button>`
            : '';

        if (compact) {
            return `
                <div class="schedule-event" style="border-left-color: ${color};"
                     onclick="event.stopPropagation(); App.openTodoForm('${todo.id}')">
                    <div class="schedule-event-header">
                        <span class="schedule-event-time">${timeStr}</span>
                    </div>
                    <div class="schedule-event-title ${isCompleted ? 'completed' : ''}">${this.escapeHtml(todo.text)}</div>
                </div>
            `;
        }

        return `
            <div class="schedule-event" style="border-left-color: ${color};"
                 onclick="event.stopPropagation(); App.openTodoForm('${todo.id}')">
                <div class="schedule-event-header">
                    <span class="schedule-event-time">${timeStr}</span>
                    ${todo.category ? `<span class="schedule-event-category">${this.escapeHtml(todo.category)}</span>` : ''}
                </div>
                <div class="schedule-event-title ${isCompleted ? 'completed' : ''}">${this.escapeHtml(todo.text)}</div>
                <div class="schedule-event-actions" onclick="event.stopPropagation();">
                    ${calendarBtn}
                    <button class="event-action-btn" onclick="event.stopPropagation(); App.setTodoProgress('${todo.id}', 'notstarted')" title="设为未开始">⏳</button>
                    <button class="event-action-btn" onclick="event.stopPropagation(); App.setTodoProgress('${todo.id}', 'inprogress')" title="设为进行中">🔄</button>
                    <button class="event-action-btn" onclick="event.stopPropagation(); App.setTodoProgress('${todo.id}', 'completed')" title="设为已完成">✅</button>
                    <button class="event-action-btn event-delete-btn" onclick="event.stopPropagation(); App.deleteTodo('${todo.id}')" title="删除">🗑️</button>
                </div>
            </div>
        `;
    },

    scheduleQuickAdd(year, month, day, hour) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const startTimeStr = `${String(hour).padStart(2, '0')}:00`;
        const endHour = hour + 1;
        const endTimeStr = `${String(endHour).padStart(2, '0')}:00`;

        const reminder = `${dateStr}T${startTimeStr}`;
        const endTime = `${dateStr}T${endTimeStr}`;

        this.openModal(`<h2>新建待办</h2>
            <div class="form-group"><label>任务内容 *</label><input type="text" id="todo-text" value="" placeholder="要做什么？"></div>
            <div class="form-row">
                <div class="form-group"><label>分类</label><select id="todo-category">
                    <option value="">无分类</option>
                    <option value="工作">💼 工作</option>
                    <option value="生活">🏠 生活</option>
                    <option value="学习">📚 学习</option>
                </select></div>
                <div class="form-group"><label>进度</label><select id="todo-progress">
                    <option value="notstarted" selected>⏳ 未开始</option>
                    <option value="inprogress">🔄 进行中</option>
                    <option value="completed">✅ 已完成</option>
                </select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>优先级</label><select id="todo-priority">
                    <option value="high">🔴 高</option>
                    <option value="medium" selected>🟡 中</option>
                    <option value="low">🟢 低</option>
                </select></div>
                <div class="form-group"><label>截止日期</label><input type="date" id="todo-due" value="${dateStr}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>⏰ 开始时间</label><input type="datetime-local" id="todo-reminder" value="${reminder}"></div>
                <div class="form-group"><label>⏰ 结束时间</label><input type="datetime-local" id="todo-endtime" value="${endTime}"></div>
            </div>
            <div class="form-group"><label>备注</label><textarea id="todo-notes" rows="2" placeholder="额外说明..."></textarea></div>
            <div style="font-size:12px;color:var(--text-muted);background:var(--info-light);padding:10px 14px;border-radius:8px;">💡 设置提醒时间后，到时会收到浏览器通知</div>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
                <button class="btn btn-primary" onclick="App.saveTodo('')">保存</button>
            </div>`);
    },

    showDayTasks(year, month, day) {
        this._currentModal = {
            type: 'dayTasks',
            year: year,
            month: month,
            day: day
        };

        const date = new Date(year, month, day);
        const dateStr = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

        const dayTodos = this.data.todos.filter(todo => {
            const d = todo.reminder || todo.dueDate;
            if (!d) return false;
            const td = new Date(d);
            return td.getFullYear() === year && td.getMonth() === month && td.getDate() === day;
        });

        const dayInterviews = this.data.interviews.filter(item => {
            if (!item.interviewDate) return false;
            const d = new Date(item.interviewDate);
            return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        });

        let contentHtml = '';

        if (dayInterviews.length > 0) {
            const sm = {
                preparing: { label: '准备面试', cls: 'tag-blue' },
                waiting: { label: '等通知', cls: 'tag-orange' },
                rejected: { label: '未通过', cls: 'tag-red' }
            };
            contentHtml += `
                <div style="margin-bottom:16px;">
                    <div style="font-size:13px;font-weight:700;color:#9333ea;margin-bottom:8px;letter-spacing:0.5px;">💼 面试安排 (${dayInterviews.length})</div>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${dayInterviews.map(iv => {
                            const st = sm[iv.status] || sm['preparing'];
                            return `<div style="padding:12px;background:#f9f5ff;border-radius:8px;border-left:4px solid #9333ea;">
                                <div style="font-size:14px;font-weight:600;margin-bottom:6px;">${this.escapeHtml(iv.company)} - ${this.escapeHtml(iv.position || '未知职位')}</div>
                                <div style="font-size:12px;color:var(--text-muted);display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                                    <span class="tag ${st.cls}">${st.label}</span>
                                    ${iv.location ? `<span>📍 ${this.escapeHtml(iv.location)}</span>` : ''}
                                    ${iv.salary ? `<span>💰 ${this.escapeHtml(iv.salary)}</span>` : ''}
                                </div>
                                ${iv.notes ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">📝 ${this.escapeHtml(iv.notes)}</div>` : ''}
                                <div style="margin-top:8px;display:flex;gap:6px;justify-content:flex-end;">
                                    <button class="btn btn-sm btn-secondary" onclick="App.closeModal();App.openInterviewForm('${iv.id}')">✏️ 编辑</button>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        if (dayTodos.length > 0) {
            const pn = { high: '高', medium: '中', low: '低' };
            contentHtml += `
                <div style="margin-bottom:16px;">
                    <div style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:8px;letter-spacing:0.5px;">✅ 待办事项 (${dayTodos.length})</div>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${dayTodos.map(todo => {
                            const rs = todo.reminder ? `⏰ ${this.formatDateTime(todo.reminder)}` : '';
                            const ds = todo.dueDate ? `📅 ${this.formatDate(todo.dueDate)}` : '';
                            const ts = todo.category ? `<span class="tag tag-blue">${this.escapeHtml(todo.category)}</span>` : '';
                            let progressTag = '', progressColor = 'tag-gray';
                            if (todo.completed || todo.progress === 'completed') { progressTag = '✅ 已完成'; progressColor = 'tag-green'; }
                            else if (todo.progress === 'inprogress') { progressTag = '🔄 进行中'; progressColor = 'tag-orange'; }
                            else { progressTag = '⏳ 未开始'; progressColor = 'tag-gray'; }

                            const calendarBtn = (todo.reminder || todo.dueDate)
                                ? `<button class="btn btn-sm btn-secondary" onclick="App.addToGoogleCalendar('${todo.id}')" title="加入Google日历">📅</button>`
                                : '';

                            return `<div style="padding:12px;background:#fafafa;border-radius:8px;border-left:4px solid ${todo.completed ? 'var(--success)' : 'var(--primary)'};">
                                <div style="font-size:14px;font-weight:600;margin-bottom:6px;${todo.completed ? 'text-decoration:line-through;color:var(--text-muted);' : ''}">${this.escapeHtml(todo.text)}</div>
                                <div style="font-size:12px;color:var(--text-muted);display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                                    ${ts}<span class="tag ${progressColor}">${progressTag}</span>
                                    ${rs ? `<span>${rs}</span>` : ''}
                                    ${ds ? `<span>${ds}</span>` : ''}
                                    <span>优先级: ${pn[todo.priority] || '中'}</span>
                                </div>
                                <div style="margin-top:10px;display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;">
                                    ${calendarBtn}
                                    <button class="btn btn-sm btn-secondary" onclick="App.setTodoProgress('${todo.id}', 'notstarted')" title="设为未开始">⏳</button>
                                    <button class="btn btn-sm btn-secondary" onclick="App.setTodoProgress('${todo.id}', 'inprogress')" title="设为进行中">🔄</button>
                                    <button class="btn btn-sm btn-secondary" onclick="App.setTodoProgress('${todo.id}', 'completed')" title="设为已完成">✅</button>
                                    <button class="btn btn-sm btn-secondary" onclick="App.closeModal();App.openTodoForm('${todo.id}')">✏️ 编辑</button>
                                    <button class="btn btn-sm btn-danger" onclick="App.closeModal();App.deleteTodo('${todo.id}')">🗑️</button>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        if (dayInterviews.length === 0 && dayTodos.length === 0) {
            contentHtml = `<div style="text-align:center;padding:30px 20px;color:var(--text-muted);">
                <div style="font-size:40px;margin-bottom:10px;">📭</div>
                <div>这一天没有安排</div>
            </div>`;
        }

        this.openModal(`<h2>📅 ${dateStr}</h2>${contentHtml}
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="App.closeModal()">关闭</button>
                <button class="btn btn-primary" 
                    onclick="App.closeModal();App.openTodoForm(null, '${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}')">
                    ➕ 新建待办
                </button>
            </div>`);
    },

    async setTodoProgress(todoId, progress) {
        try {
            const todo = this.data.todos.find(t => t.id === todoId);
            if (!todo) return;
            const updatedData = {
                text: todo.text, category: todo.category, priority: todo.priority,
                due_date: todo.dueDate, reminder: todo.reminder, end_time: todo.endTime,
                notes: todo.notes,
                completed: progress === 'completed' ? 1 : 0, progress: progress
            };
            await API.saveTodo(updatedData, todoId);
            await this.loadAllData();

            this.render();

            if (this._currentModal && this._currentModal.type === 'dayTasks') {
                const { year, month, day } = this._currentModal;
                this.showDayTasks(year, month, day);
            }

            this.showToast(
                progress === 'completed' ? '已完成！🎉' :
                progress === 'inprogress' ? '已设为进行中' : '已设为未开始', 'success'
            );
        } catch (error) { this.showToast('更新失败', 'error'); }
    },

    async toggleTodo(todoId) {
        try {
            const todo = this.data.todos.find(t => t.id === todoId);
            if (!todo) return;
            const newCompleted = !todo.completed;
            const progress = newCompleted ? 'completed' : 'notstarted';
            const updatedData = {
                text: todo.text, category: todo.category, priority: todo.priority,
                due_date: todo.dueDate, reminder: todo.reminder, end_time: todo.endTime,
                notes: todo.notes,
                completed: newCompleted ? 1 : 0, progress: progress
            };
            await API.saveTodo(updatedData, todoId);
            await this.loadAllData();
            this.render();
        } catch (error) { this.showToast('更新失败', 'error'); }
    },

    // ============ 面试渲染 ============
    renderInterviews(area) {
        const list = this.data.interviews;
        const filter = this.data.interviewFilter || 'all';

        const sm = {
            preparing: { label: '准备面试', cls: 'tag-blue' },
            waiting: { label: '等通知', cls: 'tag-orange' },
            rejected: { label: '未通过', cls: 'tag-red' }
        };

        let filteredList = list;
        if (filter !== 'all') {
            filteredList = list.filter(i => i.status === filter);
        }

        const countAll = list.length;
        const countPreparing = list.filter(i => i.status === 'preparing').length;
        const countWaiting = list.filter(i => i.status === 'waiting').length;
        const countRejected = list.filter(i => i.status === 'rejected').length;

        const filtersHtml = `<div class="todo-filters">
            <button class="todo-filter-btn ${filter === 'all' ? 'active' : ''}" onclick="App.setInterviewFilter('all')">全部 (${countAll})</button>
            <button class="todo-filter-btn ${filter === 'preparing' ? 'active' : ''}" onclick="App.setInterviewFilter('preparing')">准备面试 (${countPreparing})</button>
            <button class="todo-filter-btn ${filter === 'waiting' ? 'active' : ''}" onclick="App.setInterviewFilter('waiting')">等通知 (${countWaiting})</button>
            <button class="todo-filter-btn ${filter === 'rejected' ? 'active' : ''}" onclick="App.setInterviewFilter('rejected')">未通过 (${countRejected})</button>
        </div>`;

        if (list.length === 0) {
            area.innerHTML = `${filtersHtml}<div class="empty-state"><div class="empty-icon">💼</div><h3>没有面试记录</h3><p>记录你面试过的公司信息！</p></div>`;
            return;
        }

        if (filteredList.length === 0) {
            area.innerHTML = `${filtersHtml}<div class="empty-state"><div class="empty-icon">💼</div><h3>此状态下没有面试记录</h3><p>切换筛选器查看其他状态</p></div>`;
            return;
        }

        area.innerHTML = `${filtersHtml}<div class="interview-grid">${filteredList.map(item => {
            const st = sm[item.status] || sm['preparing'];
            return `<div class="card interview-card">
                <div class="company-name">${this.escapeHtml(item.company)}</div>
                <div class="position-name">${this.escapeHtml(item.position || '未知职位')}</div>
                <div style="margin-bottom:10px;"><span class="tag ${st.cls}">${st.label}</span></div>
                <div class="info-row">📍 ${this.escapeHtml(item.location || '未填写')}</div>
                <div class="info-row">💰 ${this.escapeHtml(item.salary || '未填写')}</div>
                <div class="info-row">📅 ${this.formatDate(item.interviewDate) || '未填写'}</div>
                ${item.notes ? `<div class="info-row" style="margin-top:8px;">📝 ${this.escapeHtml(item.notes)}</div>` : ''}
                <div style="margin-top:14px;display:flex;gap:6px;justify-content:flex-end;">
                    ${(item.jobScope || item.mission || item.services || item.interviewScript || item.strength || item.weakness || item.interviewQuestion || item.questionToAsk)
                        ? `<button class="btn btn-sm btn-secondary" onclick="App.viewInterviewScript('${item.id}')" title="查看 Script">📝</button>`
                        : ''}
                    <button class="btn btn-sm btn-secondary" onclick="App.openInterviewForm('${item.id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="App.deleteInterview('${item.id}')">🗑️</button>
                </div>
            </div>`;
        }).join('')}</div>`;
    },

    setInterviewFilter(filter) {
        this.data.interviewFilter = filter;
        this.render();
    },

    // ============ 个人资料渲染 ============
    renderProfiles(area) {
    const list = this.data.profiles;
    const currentFolder = this.data.profileFolder || 'all';

    // ⭐ 只保留 个人 / 学习 / 工作
    const baseFolders = ['个人', '学习', '工作'];
    const folderSet = new Set(baseFolders);
    list.forEach(p => {
        if (p.folder && p.folder.trim()) folderSet.add(p.folder);
    });
    const folders = Array.from(folderSet);

    // 过滤
    let filteredList = list;
    if (currentFolder !== 'all') {
        filteredList = list.filter(p => (p.folder || '') === currentFolder);
    }

    const countOf = (f) => list.filter(p => (p.folder || '') === f).length;

    // 顶部 folder bar
    const folderBar = `<div class="folder-bar">
        <div class="folder-chip ${currentFolder === 'all' ? 'active' : ''}"
             onclick="App.setProfileFolder('all')">
            📁 全部 <span class="folder-count">${list.length}</span>
        </div>
        ${folders.map(f => `
            <div class="folder-chip ${currentFolder === f ? 'active' : ''}"
                 onclick="App.setProfileFolder('${this.escapeHtml(f)}')">
                📂 ${this.escapeHtml(f)} <span class="folder-count">${countOf(f)}</span>
            </div>
        `).join('')}
    </div>`;

    if (filteredList.length === 0) {
        area.innerHTML = `${folderBar}<div class="empty-state">
            <div class="empty-icon">👤</div>
            <h3>${currentFolder === 'all' ? '没有个人资料' : '此文件夹为空'}</h3>
            <p>存放个人简介、证书、工作资料等！</p>
        </div>`;
        return;
    }

    area.innerHTML = `${folderBar}<div class="profile-grid">${filteredList.map(item => `
        <div class="card profile-card" id="profile-${item.id}" onclick="App.toggleProfileExpand('${item.id}')">
            <div class="profile-title">${item.icon || '📄'} ${this.escapeHtml(item.title)}</div>
            <div style="margin-bottom:8px;">
                <span class="tag tag-blue">📂 ${this.escapeHtml(item.folder || '未分类')}</span>
            </div>
            ${item.filePath ? `
                <div style="margin-bottom:8px;display:flex;gap:6px;flex-wrap:wrap;">
                    <a href="${item.filePath}" target="_blank" class="tag tag-green"
                       style="text-decoration:none;" onclick="event.stopPropagation();">📎 查看</a>
                    <a href="${item.filePath}" download class="tag tag-blue"
                       style="text-decoration:none;" onclick="event.stopPropagation();">⬇️ 下载</a>
                </div>
            ` : ''}
            <div class="profile-content">${this.escapeHtml(item.content || '（无内容）')}</div>
            <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:11px;color:var(--text-muted);">🕐 ${this.formatDate(item.updatedAt)}</span>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-sm btn-secondary"
                            onclick="event.stopPropagation();App.openProfileForm('${item.id}')">✏️</button>
                    <button class="btn btn-sm btn-danger"
                            onclick="event.stopPropagation();App.deleteProfile('${item.id}')">🗑️</button>
                </div>
            </div>
        </div>`).join('')}</div>`;
},

setProfileFolder(folder) {
    this.data.profileFolder = folder;
    this.render();
},

setProfileFolder(folder) {
    this.data.profileFolder = folder;
    this.render();
},

    // ============ 好去处渲染 ============
    renderPlaces(area) {
        const list = this.data.places;
        if (list.length === 0) {
            area.innerHTML = `<div class="empty-state"><div class="empty-icon">📍</div><h3>还没有收藏好去处</h3><p>收藏你喜欢的餐厅、景点等！</p></div>`;
            return;
        }
        const tm = {
            food: { label: '🍜 美食', cls: 'tag-orange' },
            cafe: { label: '☕ 咖啡', cls: 'tag-gray' },
            scenery: { label: '🏞️ 景点', cls: 'tag-green' },
            shopping: { label: '🛍️ 购物', cls: 'tag-purple' },
            entertainment: { label: '🎮 娱乐', cls: 'tag-blue' },
            other: { label: '📌 其他', cls: 'tag-gray' }
        };
        area.innerHTML = `<div class="places-grid">${list.map(item => {
            const tp = tm[item.type] || tm['other'];
            const stars = '⭐'.repeat(Math.min(5, item.rating)) + '☆'.repeat(Math.max(0, 5 - item.rating));
            return `<div class="card place-card">
                <div class="place-name">${this.escapeHtml(item.name)}</div>
                <div style="margin-bottom:8px;"><span class="tag ${tp.cls}">${tp.label}</span></div>
                <div class="place-address">📍 ${this.escapeHtml(item.address || '未填写地址')}</div>
                ${item.rating > 0 ? `<div class="place-rating"><span class="stars">${stars}</span> ${item.rating}.0</div>` : ''}
                ${item.notes ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:8px;">📝 ${this.escapeHtml(item.notes)}</div>` : ''}
                <div style="margin-top:14px;display:flex;gap:6px;justify-content:flex-end;">
                    <button class="btn btn-sm btn-secondary" onclick="App.openPlaceForm('${item.id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="App.deletePlace('${item.id}')">🗑️</button>
                </div>
            </div>`;
        }).join('')}</div>`;
    },

    // ============ 待办操作 ============
    openTodoForm(todoId = null, defaultDate = null) {
    const todo = todoId ? this.data.todos.find(t => t.id === todoId) : null;
    const text = todo?.text || '', category = todo?.category || '', priority = todo?.priority || 'medium';
    
    // ⭐ 优先用 todo 里已有的日期；编辑时没有就用 defaultDate
    const dueDate = todo?.dueDate 
        ? String(todo.dueDate).slice(0, 10) 
        : (defaultDate || '');
    
    const reminder = todo?.reminder ? String(todo.reminder).slice(0, 16) : '';
    const endTime = todo?.endTime ? String(todo.endTime).slice(0, 16) : '';
    const notes = todo?.notes || '';
    const progress = todo?.progress || 'notstarted';

    this.openModal(`<h2>${todo ? '编辑待办' : '新建待办'}</h2>
        <div class="form-group"><label>任务内容 *</label><input type="text" id="todo-text" value="${this.escapeHtml(text)}" placeholder="要做什么？"></div>
        <div class="form-row">
            <div class="form-group"><label>分类</label><select id="todo-category">
                <option value="" ${!category ? 'selected' : ''}>无分类</option>
                <option value="工作" ${category === '工作' ? 'selected' : ''}>💼 工作</option>
                <option value="生活" ${category === '生活' ? 'selected' : ''}>🏠 生活</option>
                <option value="学习" ${category === '学习' ? 'selected' : ''}>📚 学习</option>
            </select></div>
            <div class="form-group"><label>进度</label><select id="todo-progress">
                <option value="notstarted" ${progress === 'notstarted' ? 'selected' : ''}>⏳ 未开始</option>
                <option value="inprogress" ${progress === 'inprogress' ? 'selected' : ''}>🔄 进行中</option>
                <option value="completed" ${progress === 'completed' ? 'selected' : ''}>✅ 已完成</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>优先级</label><select id="todo-priority">
                <option value="high" ${priority === 'high' ? 'selected' : ''}>🔴 高</option>
                <option value="medium" ${priority === 'medium' ? 'selected' : ''}>🟡 中</option>
                <option value="low" ${priority === 'low' ? 'selected' : ''}>🟢 低</option>
            </select></div>
            <div class="form-group"><label>截止日期</label><input type="date" id="todo-due" value="${dueDate}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>⏰ 开始时间</label><input type="datetime-local" id="todo-reminder" value="${reminder}"></div>
            <div class="form-group"><label>⏰ 结束时间</label><input type="datetime-local" id="todo-endtime" value="${endTime}"></div>
        </div>
        <div class="form-group"><label>备注</label><textarea id="todo-notes" rows="2" placeholder="额外说明...">${this.escapeHtml(notes)}</textarea></div>
        <div style="font-size:12px;color:var(--text-muted);background:var(--info-light);padding:10px 14px;border-radius:8px;">💡 设置提醒时间后，到时会收到浏览器通知</div>
        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
            <button class="btn btn-primary" onclick="App.saveTodo('${todoId || ''}')">保存</button>
        </div>`);
},

    async saveTodo(todoId) {
        const text = document.getElementById('todo-text').value.trim();
        if (!text) { this.showToast('请输入任务内容', 'error'); return; }
        const reminderVal = document.getElementById('todo-reminder').value;
        const endTimeVal = document.getElementById('todo-endtime').value;
        const progress = document.getElementById('todo-progress').value;

        const todoData = {
            text,
            category: document.getElementById('todo-category').value.trim(),
            priority: document.getElementById('todo-priority').value,
            due_date: document.getElementById('todo-due').value || null,
            reminder: reminderVal ? reminderVal.replace('T', ' ') + ':00' : null,
            end_time: endTimeVal ? endTimeVal.replace('T', ' ') + ':00' : null,
            notes: document.getElementById('todo-notes').value.trim(),
            completed: progress === 'completed' ? 1 : 0,
            progress: progress,
        };

        try {
            await API.saveTodo(todoData, todoId || null);
            this.showToast(todoId ? '待办已更新' : '待办已创建', 'success');
            this.closeModal();
            await this.loadAllData();
            this.render();
        } catch (error) { this.showToast('保存失败: ' + error.message, 'error'); }
    },

    async deleteTodo(todoId) {
        if (!confirm('确定要删除这条待办吗？')) return;
        try {
            await API.deleteTodo(todoId);
            this.showToast('已删除', 'info');
            await this.loadAllData();
            this.render();
        } catch (error) { this.showToast('删除失败', 'error'); }
    },

    // ============ Google Calendar 集成 ============
    addToGoogleCalendar(todoId) {
        const todo = this.data.todos.find(t => t.id === todoId);
        if (!todo) return;

        let startTime, endTime;
        if (todo.reminder) {
            startTime = new Date(todo.reminder);
        } else if (todo.dueDate) {
            startTime = new Date(todo.dueDate);
            startTime.setHours(9, 0, 0, 0);
        } else {
            this.showToast('请先设置提醒时间或截止日期', 'warning');
            return;
        }

        if (todo.endTime) {
            endTime = new Date(todo.endTime);
        } else {
            endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
        }

        const formatGoogleDate = (date) => {
            const pad = (n) => String(n).padStart(2, '0');
            return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
        };

        const start = formatGoogleDate(startTime);
        const end = formatGoogleDate(endTime);

        const title = encodeURIComponent(`📋 ${todo.text}`);
        const details = encodeURIComponent(
            `分类: ${todo.category || '无'}\n` +
            `优先级: ${{ high: '高', medium: '中', low: '低' }[todo.priority] || '中'}\n` +
            `备注: ${todo.notes || '无'}\n\n` +
            `— 来自个人工作台`
        );
        const location = encodeURIComponent(todo.category || '');

        const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;

        window.open(googleCalUrl, '_blank');
        this.showToast('正在打开 Google Calendar，确认后即可添加', 'success');
    },

    // ============ 面试操作 ============
    openInterviewForm(interviewId = null) {
        const item = interviewId ? this.data.interviews.find(i => i.id === interviewId) : null;

        const basicTabHtml = `
            <div class="tab-content" id="tab-basic">
                <div class="form-group"><label>公司名称 *</label><input type="text" id="iv-company" value="${this.escapeHtml(item?.company || '')}" placeholder="例如：字节跳动"></div>
                <div class="form-row">
                    <div class="form-group"><label>职位</label><input type="text" id="iv-position" value="${this.escapeHtml(item?.position || '')}" placeholder="例如：前端工程师"></div>
                    <div class="form-group"><label>面试日期</label><input type="date" id="iv-date" value="${item?.interviewDate || ''}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>工作地点</label><input type="text" id="iv-location" value="${this.escapeHtml(item?.location || '')}" placeholder="例如：北京"></div>
                    <div class="form-group"><label>薪资范围</label><input type="text" id="iv-salary" value="${this.escapeHtml(item?.salary || '')}" placeholder="例如：25k-35k"></div>
                </div>
                <div class="form-group"><label>状态</label><select id="iv-status">
                    <option value="preparing" ${item?.status==='preparing'?'selected':''}>准备面试</option>
                    <option value="waiting" ${item?.status==='waiting'?'selected':''}>等通知</option>
                    <option value="rejected" ${item?.status==='rejected'?'selected':''}>未通过</option>
                </select></div>
                <div class="form-group"><label>备注</label><textarea id="iv-notes" rows="3" placeholder="面试感受等...">${this.escapeHtml(item?.notes || '')}</textarea></div>
            </div>
        `;

        const scriptTabHtml = `
            <div class="tab-content" id="tab-script" style="display:none;">
                <div class="script-tip">💡 记录面试准备话术，面试前复习一下，更从容</div>

                <div class="form-group">
                    <label>📋 Job Scope（工作范围）</label>
                    <textarea id="iv-job-scope" rows="4" placeholder="这个职位主要负责什么？日常工作任务...">${this.escapeHtml(item?.jobScope || '')}</textarea>
                </div>

                <div class="form-group">
                    <label>🎯 Mission（公司使命）</label>
                    <textarea id="iv-mission" rows="3" placeholder="公司的使命、愿景...">${this.escapeHtml(item?.mission || '')}</textarea>
                </div>

                <div class="form-group">
                    <label>🛠️ Services（产品/服务）</label>
                    <textarea id="iv-services" rows="3" placeholder="公司的主要产品或服务...">${this.escapeHtml(item?.services || '')}</textarea>
                </div>

                <div class="form-group">
                    <label>💬 Script（面试话术）</label>
                    <textarea id="iv-interview-script" rows="6" placeholder="自我介绍、为什么选择这家公司、职业规划等...">${this.escapeHtml(item?.interviewScript || '')}</textarea>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>💪 Strength（优势）</label>
                        <textarea id="iv-strength" rows="4" placeholder="我的优势和亮点...">${this.escapeHtml(item?.strength || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>⚠️ Weakness（劣势）</label>
                        <textarea id="iv-weakness" rows="4" placeholder="我的不足和如何改进...">${this.escapeHtml(item?.weakness || '')}</textarea>
                    </div>
                </div>

                <div class="form-group">
                    <label>❓ Interview Question（面试官可能问的问题）</label>
                    <textarea id="iv-interview-question" rows="6" placeholder="1. 请介绍一下自己&#10;2. 为什么离开上一家公司&#10;3. ...">${this.escapeHtml(item?.interviewQuestion || '')}</textarea>
                </div>

                <div class="form-group">
                    <label>🙋 Question Want to Ask（我想问的问题）</label>
                    <textarea id="iv-question-to-ask" rows="5" placeholder="1. 团队规模多大？&#10;2. 这个岗位的发展路径？&#10;3. ...">${this.escapeHtml(item?.questionToAsk || '')}</textarea>
                </div>
            </div>
        `;

        this.openModal(`<h2>${item ? '编辑面试记录' : '新建面试记录'}</h2>
            <div class="tabs">
                <button class="tab-btn active" onclick="App.switchTab('basic')">📋 基本信息</button>
                <button class="tab-btn" onclick="App.switchTab('script')">📝 面试 Script</button>
            </div>
            ${basicTabHtml}
            ${scriptTabHtml}
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
                <button class="btn btn-primary" onclick="App.saveInterview('${interviewId || ''}')">保存</button>
            </div>`);
    },

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        document.getElementById('tab-basic').style.display = tabName === 'basic' ? '' : 'none';
        document.getElementById('tab-script').style.display = tabName === 'script' ? '' : 'none';
    },

    async saveInterview(interviewId) {
        const company = document.getElementById('iv-company').value.trim();
        if (!company) { this.showToast('请输入公司名称', 'error'); return; }

        const data = {
            company,
            position: document.getElementById('iv-position').value.trim(),
            interview_date: document.getElementById('iv-date').value || null,
            location: document.getElementById('iv-location').value.trim(),
            salary: document.getElementById('iv-salary').value.trim(),
            status: document.getElementById('iv-status').value,
            notes: document.getElementById('iv-notes').value.trim(),
            job_scope: document.getElementById('iv-job-scope').value.trim(),
            mission: document.getElementById('iv-mission').value.trim(),
            services: document.getElementById('iv-services').value.trim(),
            interview_script: document.getElementById('iv-interview-script').value.trim(),
            strength: document.getElementById('iv-strength').value.trim(),
            weakness: document.getElementById('iv-weakness').value.trim(),
            interview_question: document.getElementById('iv-interview-question').value.trim(),
            question_to_ask: document.getElementById('iv-question-to-ask').value.trim()
        };

        try {
            await API.saveInterview(data, interviewId || null);
            this.showToast(interviewId ? '面试记录已更新' : '面试记录已添加', 'success');
            this.closeModal();
            await this.loadAllData();
            this.render();
        } catch (error) { this.showToast('保存失败: ' + error.message, 'error'); }
    },

    async deleteInterview(id) {
        if (!confirm('确定要删除这条面试记录吗？')) return;
        try {
            await API.deleteInterview(id);
            this.showToast('已删除', 'info');
            await this.loadAllData();
            this.render();
        } catch (error) { this.showToast('删除失败', 'error'); }
    },

    viewInterviewScript(id) {
        const item = this.data.interviews.find(i => i.id === id);
        if (!item) return;

        const sections = [
            { label: '📋 Job Scope', value: item.jobScope },
            { label: '🎯 Mission', value: item.mission },
            { label: '🛠️ Services', value: item.services },
            { label: '💬 Script', value: item.interviewScript },
            { label: '💪 Strength', value: item.strength },
            { label: '⚠️ Weakness', value: item.weakness },
            { label: '❓ Interview Question', value: item.interviewQuestion },
            { label: '🙋 Question Want to Ask', value: item.questionToAsk },
        ];

        let contentHtml = '';
        sections.forEach(sec => {
            if (sec.value) {
                contentHtml += `
                    <div class="script-section">
                        <div class="script-section-label">${sec.label}</div>
                        <div class="script-section-content">${this.escapeHtml(sec.value).replace(/\n/g, '<br>')}</div>
                    </div>
                `;
            }
        });

        if (!contentHtml) {
            contentHtml = `<div style="text-align:center;padding:30px;color:var(--text-muted);">
                <div style="font-size:40px;margin-bottom:10px;">📝</div>
                <div>还没有填写面试 Script</div>
            </div>`;
        }

        this.openModal(`
            <h2>📝 ${this.escapeHtml(item.company)} - 面试 Script</h2>
            <div style="margin-bottom:16px;font-size:13px;color:var(--text-muted);">
                ${this.escapeHtml(item.position || '未知职位')}
            </div>
            ${contentHtml}
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="App.closeModal()">关闭</button>
                <button class="btn btn-primary" onclick="App.closeModal();App.openInterviewForm('${item.id}')">✏️ 编辑</button>
            </div>
        `);
    },

    // ============ 个人资料操作 ============
    toggleProfileExpand(id) {
        const el = document.getElementById('profile-' + id);
        if (el) el.classList.toggle('expanded');
    },

    openProfileForm(profileId = null) {
    const item = profileId ? this.data.profiles.find(p => p.id === profileId) : null;
    const title = item?.title || '', icon = item?.icon || '📄', content = item?.content || '';
    const folder = item?.folder || '个人', filePath = item?.filePath || '';
    const icons = ['📄', '👤', '💼', '🎓', '🛠️', '📝', '🏆', '💡', '📌', '🔗', '📋', '⭐'];

    // ⭐ 只保留 个人 / 学习 / 工作
    const baseFolders = ['个人', '学习', '工作'];
    const folderSet = new Set(baseFolders);
    this.data.profiles.forEach(p => {
        if (p.folder && p.folder.trim()) folderSet.add(p.folder);
    });
    if (folder) folderSet.add(folder);

    const folderOptions = Array.from(folderSet)
        .map(f => `<option value="${this.escapeHtml(f)}" ${folder === f ? 'selected' : ''}>${this.escapeHtml(f)}</option>`)
        .join('');

    this.openModal(`<h2>${item ? '编辑资料' : '新建资料'}</h2>
        <div class="form-row">
            <div class="form-group" style="flex:2;"><label>资料标题 *</label><input type="text" id="pf-title" value="${this.escapeHtml(title)}" placeholder="例如：个人简介"></div>
            <div class="form-group" style="flex:1;"><label>图标</label><select id="pf-icon">${icons.map(i => `<option value="${i}" ${icon===i?'selected':''}>${i}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label>文件夹</label><select id="pf-folder">${folderOptions}</select></div>
        <div class="form-group"><label>上传文件</label><input type="file" id="pf-file" accept=".pdf,.doc,.docx,.txt,.jpg,.png,.jpeg">${filePath ? `<div style="margin-top:8px;font-size:12px;color:var(--text-muted);">当前文件: <a href="${filePath}" target="_blank">查看</a></div>` : ''}<input type="hidden" id="pf-file-path" value="${filePath}"></div>
        <div class="form-group"><label>资料内容</label><textarea id="pf-content" rows="6" placeholder="输入备注或说明...">${this.escapeHtml(content)}</textarea></div>
        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
            <button class="btn btn-primary" onclick="App.saveProfile('${profileId || ''}')">保存</button>
        </div>`);
},

    async saveProfile(profileId) {
        const title = document.getElementById('pf-title').value.trim();
        if (!title) { this.showToast('请填写标题', 'error'); return; }
        let filePath = document.getElementById('pf-file-path').value;
        const fileInput = document.getElementById('pf-file');
        if (fileInput && fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            try {
                const response = await fetch('api.php?action=upload_file', { method: 'POST', body: formData });
                const result = await response.json();
                if (result.success) filePath = result.file_path;
                else { this.showToast('文件上传失败: ' + (result.error || ''), 'error'); return; }
            } catch (error) { this.showToast('文件上传失败: ' + error.message, 'error'); return; }
        }
        const data = {
            title,
            icon: document.getElementById('pf-icon').value,
            folder: document.getElementById('pf-folder').value || '未分类',
            content: document.getElementById('pf-content').value,
            file_path: filePath || null
        };
        try {
            await API.saveProfile(data, profileId || null);
            this.showToast(profileId ? '资料已更新' : '资料已保存', 'success');
            this.closeModal();
            await this.loadAllData();
            this.render();
        } catch (error) { this.showToast('保存失败: ' + error.message, 'error'); }
    },

    async deleteProfile(id) {
        if (!confirm('确定要删除这条资料吗？')) return;
        try {
            await API.deleteProfile(id);
            this.showToast('已删除', 'info');
            await this.loadAllData();
            this.render();
        } catch (error) { this.showToast('删除失败', 'error'); }
    },

    // ============ 好去处操作 ============
    openPlaceForm(placeId = null) {
        const item = placeId ? this.data.places.find(p => p.id === placeId) : null;
        const name = item?.name || '', type = item?.type || 'food', address = item?.address || '';
        const rating = item?.rating || 0, notes = item?.notes || '';
        this.openModal(`<h2>${item ? '编辑好去处' : '新建好去处'}</h2>
            <div class="form-group"><label>地点名称 *</label><input type="text" id="pl-name" value="${this.escapeHtml(name)}" placeholder="例如：西湖"></div>
            <div class="form-row">
                <div class="form-group"><label>类型</label><select id="pl-type">
                    <option value="food" ${type==='food'?'selected':''}>🍜 美食</option>
                    <option value="cafe" ${type==='cafe'?'selected':''}>☕ 咖啡</option>
                    <option value="scenery" ${type==='scenery'?'selected':''}>🏞️ 景点</option>
                    <option value="shopping" ${type==='shopping'?'selected':''}>🛍️ 购物</option>
                    <option value="entertainment" ${type==='entertainment'?'selected':''}>🎮 娱乐</option>
                    <option value="other" ${type==='other'?'selected':''}>📌 其他</option>
                </select></div>
                <div class="form-group"><label>评分 (1-5)</label><select id="pl-rating">
                    <option value="0" ${rating==0?'selected':''}>未评分</option>
                    <option value="5" ${rating==5?'selected':''}>⭐⭐⭐⭐⭐ 5</option>
                    <option value="4" ${rating==4?'selected':''}>⭐⭐⭐⭐ 4</option>
                    <option value="3" ${rating==3?'selected':''}>⭐⭐⭐ 3</option>
                    <option value="2" ${rating==2?'selected':''}>⭐⭐ 2</option>
                    <option value="1" ${rating==1?'selected':''}>⭐ 1</option>
                </select></div>
            </div>
            <div class="form-group"><label>地址</label><input type="text" id="pl-address" value="${this.escapeHtml(address)}" placeholder="详细地址"></div>
            <div class="form-group"><label>备注</label><textarea id="pl-notes" rows="3" placeholder="推荐理由等...">${this.escapeHtml(notes)}</textarea></div>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
                <button class="btn btn-primary" onclick="App.savePlace('${placeId || ''}')">保存</button>
            </div>`);
    },

    async savePlace(placeId) {
        const name = document.getElementById('pl-name').value.trim();
        if (!name) { this.showToast('请输入地点名称', 'error'); return; }
        const data = {
            name,
            type: document.getElementById('pl-type').value,
            rating: parseInt(document.getElementById('pl-rating').value),
            address: document.getElementById('pl-address').value.trim(),
            notes: document.getElementById('pl-notes').value.trim()
        };
        try {
            await API.savePlace(data, placeId || null);
            this.showToast(placeId ? '好去处已更新' : '好去处已收藏', 'success');
            this.closeModal();
            await this.loadAllData();
            this.render();
        } catch (error) { this.showToast('保存失败: ' + error.message, 'error'); }
    },

    async deletePlace(id) {
        if (!confirm('确定要删除这个好去处吗？')) return;
        try {
            await API.deletePlace(id);
            this.showToast('已删除', 'info');
            await this.loadAllData();
            this.render();
        } catch (error) { this.showToast('删除失败', 'error'); }
    },
};

// =============================================
// 全局暴露 + 初始化
// =============================================
window.App = App;
window.handleAdd = () => App.handleAdd();

document.addEventListener('DOMContentLoaded', () => {
    App.restoreNavOrder();
    App.init();
});
