class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.currentCategory = 'all';
        this.currentPriority = 'all';
        this.searchQuery = '';
        this.notificationCheckInterval = null;
        this.soundEnabled = true;
        this.init();
    }

    init() {
        this.renderTasks();
        this.attachEventListeners();
        this.updateStats();
        this.checkNotificationPermission();
        this.startNotificationChecker();
        this.logDebugInfo();
    }

    logDebugInfo() {
        console.log('=== Task Manager Debug Info ===');
        console.log('Current time:', new Date().toLocaleString());
        console.log('Notification permission:', Notification.permission);
        console.log('Total tasks:', this.tasks.length);
        console.log('Tasks with reminders:', this.tasks.filter(t => t.reminder && t.reminder !== 'none').length);
        console.log('Notification checker running:', this.notificationCheckInterval !== null);
    }

    loadTasks() {
        const tasks = localStorage.getItem('schedulingTasks');
        return tasks ? JSON.parse(tasks) : [];
    }

    saveTasks() {
        localStorage.setItem('schedulingTasks', JSON.stringify(this.tasks));
        this.updateStats();
    }

    checkNotificationPermission() {
        if ('Notification' in window) {
            console.log('Notification API available');
            if (Notification.permission === 'default') {
                document.getElementById('notificationBanner').style.display = 'flex';
            } else if (Notification.permission === 'granted') {
                console.log('Notifications are enabled ✓');
            } else {
                console.log('Notifications are blocked ✗');
                alert('Notifications are blocked. Please enable them in your browser settings.');
            }
        } else {
            console.log('Notification API not available in this browser');
        }
    }

    requestNotificationPermission() {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                console.log('Notification permission:', permission);
                if (permission === 'granted') {
                    this.showNotification('Notifications enabled! You will receive reminders for your tasks.', 'success');
                    document.getElementById('notificationBanner').style.display = 'none';
                    
                    // Test notification
                    new Notification('Task Scheduler', {
                        body: 'Notifications are now enabled! You\'ll get reminders for your tasks.',
                        icon: '📅',
                        tag: 'test-notification'
                    });
                } else {
                    alert('Please enable notifications in your browser settings to receive task reminders.');
                }
            });
        }
    }

    playNotificationSound() {
        if (!this.soundEnabled) return;
        
        try {
            // Create a simple beep sound using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('Could not play sound:', e);
        }
    }

    startNotificationChecker() {
        console.log('Starting notification checker...');
        
        // Check every 30 seconds for more frequent updates
        this.notificationCheckInterval = setInterval(() => {
            this.checkForReminders();
        }, 30000); // 30 seconds

        // Also check immediately
        this.checkForReminders();
    }

    checkForReminders() {
        const now = new Date();
        console.log('Checking for reminders at:', now.toLocaleString());
        
        let foundReminders = 0;
        
        this.tasks.forEach(task => {
            if (task.completed) return;
            
            const taskTime = new Date(task.dateTime);
            const timeDiff = taskTime - now;
            const minutesDiff = Math.floor(timeDiff / 60000);
            const secondsDiff = Math.floor(timeDiff / 1000);

            // Debug logging for tasks with reminders
            if (task.reminder && task.reminder !== 'none') {
                console.log(`Task: "${task.title}"`);
                console.log(`  Task time: ${taskTime.toLocaleString()}`);
                console.log(`  Time until task: ${minutesDiff} minutes (${secondsDiff} seconds)`);
                console.log(`  Reminder: ${task.reminder} minutes before`);
                console.log(`  Already notified: ${task.notifiedReminder ? 'Yes' : 'No'}`);
            }

            // Check if task is overdue
            if (timeDiff < 0 && !task.notifiedOverdue) {
                console.log(`⚠️ Task "${task.title}" is OVERDUE`);
                this.sendNotification(task, 'overdue');
                task.notifiedOverdue = true;
                this.saveTasks();
                foundReminders++;
            }

            // Check if reminder should be sent
            if (task.reminder && task.reminder !== 'none' && !task.notifiedReminder) {
                const reminderMinutes = parseInt(task.reminder);
                const reminderTime = taskTime - (reminderMinutes * 60000); // Reminder time in milliseconds
                const timeUntilReminder = reminderTime - now;
                const minutesUntilReminder = Math.floor(timeUntilReminder / 60000);
                
                console.log(`  Time until reminder: ${minutesUntilReminder} minutes`);
                
                // Send notification if we've reached or passed the reminder time
                if (timeUntilReminder <= 0 && timeUntilReminder > -60000) { // Within 1 minute past reminder time
                    console.log(`🔔 Sending reminder for "${task.title}"`);
                    this.sendNotification(task, 'reminder', reminderMinutes);
                    task.notifiedReminder = true;
                    this.saveTasks();
                    foundReminders++;
                }
            }

            // Default notification for tasks starting very soon (no custom reminder)
            if ((!task.reminder || task.reminder === 'none') && !task.notifiedSoon) {
                if (minutesDiff <= 5 && minutesDiff >= 0) {
                    console.log(`⏰ Task "${task.title}" starting soon`);
                    this.sendNotification(task, 'soon');
                    task.notifiedSoon = true;
                    this.saveTasks();
                    foundReminders++;
                }
            }
        });

        if (foundReminders > 0) {
            console.log(`✓ Sent ${foundReminders} reminder(s)`);
            this.renderTasks();
        } else {
            console.log('No reminders to send at this time');
        }
    }

    sendNotification(task, type, reminderTime = null) {
        console.log(`Sending ${type} notification for task: "${task.title}"`);
        
        let title, body, icon;

        switch(type) {
            case 'overdue':
                title = '⚠️ Task Overdue!';
                body = `"${task.title}" is overdue!`;
                icon = '⚠️';
                break;
            case 'reminder':
                title = '🔔 Task Reminder';
                body = `"${task.title}" starts in ${reminderTime} minutes!`;
                icon = '🔔';
                break;
            case 'soon':
                title = '⏰ Task Starting Soon';
                body = `"${task.title}" starts in 5 minutes!`;
                icon = '⏰';
                break;
        }

        // Play sound
        this.playNotificationSound();

        // Show in-app notification
        this.showNotification(`${title} - ${body}`, type === 'overdue' ? 'warning' : 'info');

        // Send browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                const notification = new Notification(title, {
                    body: body,
                    icon: icon,
                    badge: icon,
                    tag: `task-${task.id}-${type}`,
                    requireInteraction: type === 'overdue',
                    vibrate: [200, 100, 200]
                });

                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };

                console.log('Browser notification sent successfully');
            } catch (e) {
                console.error('Failed to send browser notification:', e);
            }
        } else {
            console.log('Browser notifications not available or not permitted');
        }
    }

    addTask(task) {
        const newTask = {
            id: Date.now(),
            title: task.title,
            description: task.description,
            dateTime: task.dateTime,
            category: task.category,
            priority: task.priority || 'Medium',
            reminder: task.reminder || 'none',
            tags: task.tags || [],
            completed: false,
            notifiedReminder: false,
            notifiedSoon: false,
            notifiedOverdue: false,
            createdAt: new Date().toISOString()
        };
        
        this.tasks.push(newTask);
        this.saveTasks();
        this.renderTasks();
        this.showNotification('Task added successfully!', 'success');
        
        // Log the new task
        console.log('New task added:', {
            title: newTask.title,
            time: new Date(newTask.dateTime).toLocaleString(),
            reminder: newTask.reminder
        });
        
        // Immediately check if this task needs a reminder soon
        setTimeout(() => this.checkForReminders(), 1000);
    }

    updateTask(id, updatedTask) {
        const index = this.tasks.findIndex(task => task.id === id);
        if (index !== -1) {
            if (this.tasks[index].dateTime !== updatedTask.dateTime || 
                this.tasks[index].reminder !== updatedTask.reminder) {
                updatedTask.notifiedReminder = false;
                updatedTask.notifiedSoon = false;
                updatedTask.notifiedOverdue = false;
            }
            this.tasks[index] = { ...this.tasks[index], ...updatedTask };
            this.saveTasks();
            this.renderTasks();
            this.showNotification('Task updated successfully!', 'success');
            
            // Check reminders after update
            setTimeout(() => this.checkForReminders(), 1000);
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.saveTasks();
        this.renderTasks();
        this.showNotification('Task deleted!', 'success');
    }

    toggleComplete(id) {
        const task = this.tasks.find(task => task.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks();
            this.showNotification(task.completed ? 'Task completed! 🎉' : 'Task marked as incomplete', 'success');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        const colors = {
            success: '#50C878',
            info: '#4A90E2',
            warning: '#F39C12',
            error: '#E74C3C'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${colors[type] || colors.info};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 600;
            animation: slideIn 0.3s ease;
            max-width: 350px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
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
        } else if (this.currentFilter === 'overdue') {
            filtered = filtered.filter(task => {
                const taskDate = new Date(task.dateTime);
                return taskDate < now && !task.completed;
            });
        } else if (this.currentFilter === 'completed') {
            filtered = filtered.filter(task => task.completed);
        }

        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(task => task.category === this.currentCategory);
        }

        if (this.currentPriority !== 'all') {
            filtered = filtered.filter(task => task.priority === this.currentPriority);
        }

        if (this.searchQuery.trim() !== '') {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(task => {
                const titleMatch = task.title.toLowerCase().includes(query);
                const descMatch = task.description?.toLowerCase().includes(query);
                const tagsMatch = task.tags?.some(tag => tag.toLowerCase().includes(query));
                return titleMatch || descMatch || tagsMatch;
            });
        }

        const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        filtered.sort((a, b) => {
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.dateTime) - new Date(b.dateTime);
        });

        return filtered;
    }

    getTaskStatus(task) {
        if (task.completed) return 'completed';
        
        const now = new Date();
        const taskTime = new Date(task.dateTime);
        const timeDiff = taskTime - now;
        const minutesDiff = Math.floor(timeDiff / 60000);

        if (timeDiff < 0) return 'overdue';
        if (minutesDiff <= 30) return 'soon';
        if (minutesDiff <= 60) return 'upcoming-soon';
        
        return 'normal';
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
        const status = this.getTaskStatus(task);
        card.className = `task-card ${task.completed ? 'completed' : ''} priority-${task.priority.toLowerCase()} status-${status}`;
        card.setAttribute('data-category', task.category);
        card.setAttribute('data-priority', task.priority);

        const dateTime = new Date(task.dateTime);
        const now = new Date();
        const timeDiff = dateTime - now;
        const minutesDiff = Math.floor(timeDiff / 60000);

        const formattedDateTime = dateTime.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let timeText = '';
        if (!task.completed) {
            if (timeDiff < 0) {
                const hoursOverdue = Math.floor(Math.abs(timeDiff) / 3600000);
                timeText = `<span class="time-indicator overdue">⚠️ Overdue by ${hoursOverdue > 0 ? hoursOverdue + ' hours' : Math.abs(minutesDiff) + ' minutes'}</span>`;
            } else if (minutesDiff <= 30) {
                timeText = `<span class="time-indicator soon">⏰ Starting in ${minutesDiff} minutes</span>`;
            } else if (minutesDiff <= 60) {
                timeText = `<span class="time-indicator upcoming">⏰ Starting soon</span>`;
            }
        }

        const tagsHTML = task.tags && task.tags.length > 0
            ? task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('')
            : '';

        const reminderText = task.reminder && task.reminder !== 'none'
            ? `<span class="reminder-badge">🔔 ${task.reminder < 60 ? task.reminder + ' min' : task.reminder / 60 + ' hr'} reminder</span>`
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
                <div class="task-datetime">
                    📅 ${formattedDateTime}
                    ${reminderText}
                </div>
                ${timeText}
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
        document.getElementById('editReminder').value = task.reminder || 'none';
        document.getElementById('editTags').value = task.tags ? task.tags.join(', ') : '';

        document.getElementById('editModal').style.display = 'block';
    }

    updateStats() {
        const now = new Date();
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const overdue = this.tasks.filter(t => !t.completed && new Date(t.dateTime) < now).length;

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('pendingTasks').textContent = pending;
        document.getElementById('overdueTasks').textContent = overdue;
    }

    parseTags(tagsString) {
        if (!tagsString || tagsString.trim() === '') return [];
        return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    }

    attachEventListeners() {
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const task = {
                title: document.getElementById('title').value,
                description: document.getElementById('description').value,
                dateTime: document.getElementById('dateTime').value,
                category: document.getElementById('category').value,
                priority: document.getElementById('priority').value,
                reminder: document.getElementById('reminder').value,
                tags: this.parseTags(document.getElementById('tags').value)
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
                category: document.getElementById('editCategory').value,
                priority: document.getElementById('editPriority').value,
                reminder: document.getElementById('editReminder').value,
                tags: this.parseTags(document.getElementById('editTags').value)
            };
            this.updateTask(id, updatedTask);
            document.getElementById('editModal').style.display = 'none';
        });

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

        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.currentCategory = e.target.value;
            this.renderTasks();
        });

        document.getElementById('priorityFilter').addEventListener('change', (e) => {
            this.currentPriority = e.target.value;
            this.renderTasks();
        });

        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
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

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
