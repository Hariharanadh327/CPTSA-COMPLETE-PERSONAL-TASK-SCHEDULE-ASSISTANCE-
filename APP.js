class TaskManager {
   
    constructor() {
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.currentCategory = 'all';
        this.init();
    }

    init() {
        this.renderTasks();
        this.attachEventListeners();
    }

    loadTasks() {
        const tasks = localStorage.getItem('schedulingTasks');
        return tasks ? JSON.parse(tasks) : [];
    }

    saveTasks() {
        localStorage.setItem('schedulingTasks', JSON.stringify(this.tasks));
    }

    addTask(task) {
        const newTask = {
            id: Date.now(),
            title: task.title,
            description: task.description,
            dateTime: task.dateTime,
            category: task.category,
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

        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(task => task.category === this.currentCategory);
        }

        filtered.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

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
        card.className = `task-card ${task.completed ? 'completed' : ''}`;
        card.setAttribute('data-category', task.category);

        const dateTime = new Date(task.dateTime);
        const formattedDateTime = dateTime.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        card.innerHTML = `
            <div class="task-info">
                <div class="task-header">
                    <h3 class="task-title ${task.completed ? 'completed' : ''}">${task.title}</h3>
                    <span class="task-category">${task.category}</span>
                </div>
                <p class="task-description">${task.description || 'No description'}</p>
                <div class="task-datetime">${formattedDateTime}</div>
            </div>
            <div class="task-actions">
                <button class="btn btn-success" onclick="taskManager.toggleComplete(${task.id})">
                    ${task.completed ? 'Undo' : ' Complete'}
                </button>
                <button class="btn btn-edit" onclick="taskManager.openEditModal(${task.id})">
                    Edit
                </button>
                <button class="btn btn-danger" onclick="taskManager.deleteTask(${task.id})">
                     Delete
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

        document.getElementById('editModal').style.display = 'block';
    }

    attachEventListeners() {
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const task = {
                title: document.getElementById('title').value,
                description: document.getElementById('description').value,
                dateTime: document.getElementById('dateTime').value,
                category: document.getElementById('category').value
            };
            this.addTask(task);
            e.target.reset();
        });

        document.getElementById('editTaskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = parseInt(document.getElementById('editTaskId').value);
            const updatedTask = {
                title: document.getElementById('editTitle').value,
                description: document.getElementById('editDescription').value,
                dateTime: document.getElementById('editDateTime').value,
                category: document.getElementById('editCategory').value
            };
            this.updateTask(id, updatedTask);
            document.getElementById('editModal').style.display = 'none';
        });

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.getAttribute('data-filter');
                this.renderTasks();
            });
        });

        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.currentCategory = e.target.value;
            this.renderTasks();
        });

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