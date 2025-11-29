class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.currentCategory = 'all';
        this.currentPriority = 'all';
        this.searchQuery = '';
        this.init();
    }

    init() {
        this.renderTasks();
        this.attachEventListeners();
        this.updateStats();
    }

    loadTasks() {
        const tasks = localStorage.getItem('schedulingTasks');
        return tasks ? JSON.parse(tasks) : [];
    }

    saveTasks() {
        localStorage.setItem('schedulingTasks', JSON.stringify(this.tasks));
        this.updateStats();
    }

    addTask(task) {
        const newTask = {
            id: Date.now(),
            title: task.title,
            description: task.description,
            dateTime: task.dateTime,
            category: task.category,
            priority: task.priority || 'Medium',
            tags: task.tags || [],
            completed: false,
            createdAt: new Date().toISOString()
        };
        this.tasks.push(newTask);
        this.saveTasks();
        this.renderTasks();
    }

    updateTask(id, updatedTask) {
        const index = this.tasks.findIndex(task => task.id === id);
        if (index !== -1) {
            this.tasks[index] = { ...this.tasks[index], ...updatedTask };
            this.saveTasks();
            this.renderTasks();
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.saveTasks();
        this.renderTasks();
    }

    toggleComplete(id) {
        const task = this.tasks.find(task => task.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks();
        }
    }

    filterTasks() {
        let filtered = [...this.tasks];
        const now = new Date();

        // Filter by time
        if (this.currentFilter === 'today') {
            filtered = filtered.filter(task => {
                const taskDate = new Date(task.dateTime);
                return taskDate.toDateString() === now.toDateString();
            });
        } else if (this.currentFilter === 'upcoming') {
            filtered = filtered.filter(task => {
                const taskDate = new Date(task.dateTime);
                return taskDate > now && !task.completed;
            });
        } else if (this.currentFilter === 'completed') {
            filtered = filtered.filter(task => task.completed);
        }

        // Filter by category
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(task => task.category === this.currentCategory);
        }

        // Filter by priority
        if (this.currentPriority !== 'all') {
            filtered = filtered.filter(task => task.priority === this.currentPriority);
        }

        // Filter by search query
        if (this.searchQuery.trim() !== '') {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(task => {
                const titleMatch = task.title.toLowerCase().includes(query);
                const descMatch = task.description?.toLowerCase().includes(query);
                const tagsMatch = task.tags?.some(tag => tag.toLowerCase().includes(query));
                return titleMatch || descMatch || tagsMatch;
            });
        }

        // Sort by priority (High > Medium > Low) then by date
        const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        filtered.sort((a, b) => {
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.dateTime) - new Date(b.dateTime);
        });

        return filtered;
    }

    renderTasks() {
        const tasksList = document.getElementById('tasksList');
        const emptyState = document.getElementById('emptyState');
        const filtered = this.filterTasks();

        if (filtered.length === 0) {
            tasksList.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        tasksList.style.display = 'grid';
        emptyState.style.display = 'none';
        tasksList.innerHTML = '';

        filtered.forEach(task => {
            const taskCard = this.createTaskCard(task);
            tasksList.appendChild(taskCard);
        });
    }

    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = `task-card ${task.completed ? 'completed' : ''} priority-${task.priority.toLowerCase()}`;
        card.setAttribute('data-category', task.category);
        card.setAttribute('data-priority', task.priority);

        const dateTime = new Date(task.dateTime);
        const formattedDateTime = dateTime.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Create tags HTML
        const tagsHTML = task.tags && task.tags.length > 0
            ? task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('')
            : '';

        card.innerHTML = `
            <div class="task-priority-indicator"></div>
            <div class="task-info">
                <div class="task-header">
                    <h3 class="task-title ${task.completed ? 'completed' : ''}">${task.title}</h3>
                    <div class="task-badges">
                        <span class="task-category">${task.category}</span>
                        <span class="task-priority priority-${task.priority.toLowerCase()}">${task.priority}</span>
                    </div>
                </div>
                <p class="task-description">${task.description || 'No description'}</p>
                ${tagsHTML ? `<div class="task-tags">${tagsHTML}</div>` : ''}
                <div class="task-datetime">📅 ${formattedDateTime}</div>
            </div>
            <div class="task-actions">
                <button class="btn btn-success" onclick="taskManager.toggleComplete(${task.id})" title="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}">
                    ${task.completed ? '↩️ Undo' : '✓ Complete'}
                </button>
                <button class="btn btn-edit" onclick="taskManager.openEditModal(${task.id})" title="Edit task">
                    ✏️ Edit
                </button>
                <button class="btn btn-danger" onclick="taskManager.deleteTask(${task.id})" title="Delete task">
                    🗑️ Delete
                </button>
            </div>
        `;

        return card;
    }

    openEditModal(id) {
        const task = this.tasks.find(task => task.id === id);
        if (!task) return;

        document.getElementById('editTaskId').value = task.id;
        document.getElementById('editTitle').value = task.title;
        document.getElementById('editDescription').value = task.description || '';
        document.getElementById('editDateTime').value = task.dateTime;
        document.getElementById('editCategory').value = task.category;
        document.getElementById('editPriority').value = task.priority || 'Medium';
        document.getElementById('editTags').value = task.tags ? task.tags.join(', ') : '';

        document.getElementById('editModal').style.display = 'block';
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const highPriority = this.tasks.filter(t => t.priority === 'High' && !t.completed).length;

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('pendingTasks').textContent = pending;
        document.getElementById('highPriorityTasks').textContent = highPriority;
    }

    parseTags(tagsString) {
        if (!tagsString || tagsString.trim() === '') return [];
        return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    }

    attachEventListeners() {
        // Add task form
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const task = {
                title: document.getElementById('title').value,
                description: document.getElementById('description').value,
                dateTime: document.getElementById('dateTime').value,
                category: document.getElementById('category').value,
                priority: document.getElementById('priority').value,
                tags: this.parseTags(document.getElementById('tags').value)
            };
            this.addTask(task);
            e.target.reset();
        });

        // Edit task form
        document.getElementById('editTaskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = parseInt(document.getElementById('editTaskId').value);
            const updatedTask = {
                title: document.getElementById('editTitle').value,
                description: document.getElementById('editDescription').value,
                dateTime: document.getElementById('editDateTime').value,
                category: document.getElementById('editCategory').value,
                priority: document.getElementById('editPriority').value,
                tags: this.parseTags(document.getElementById('editTags').value)
            };
            this.updateTask(id, updatedTask);
            document.getElementById('editModal').style.display = 'none';
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.target.getAttribute('data-filter')) {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.currentFilter = e.target.getAttribute('data-filter');
                    this.renderTasks();
                }
            });
        });

        // Category filter
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.currentCategory = e.target.value;
            this.renderTasks();
        });

        // Priority filter
        document.getElementById('priorityFilter').addEventListener('change', (e) => {
            this.currentPriority = e.target.value;
            this.renderTasks();
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderTasks();
        });

        // Modal close
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('editModal').style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('editModal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

const taskManager = new TaskManager();
