class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.currentCategory = 'all';
        this.currentPriority = 'all';
        this.searchQuery = '';
        this.notificationCheckInterval = null;
        this.soundEnabled = true;
        this.darkMode = localStorage.getItem('darkMode') === 'true';
        this.init();
    }

    init() {
        this.applyDarkMode();
        this.renderTasks();
        this.attachEventListeners();
        this.updateStats();
        this.checkNotificationPermission();
        this.startNotificationChecker();
        this.logDebugInfo();
        this.updateAnalytics();
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
        this.updateAnalytics();
    }

    // Dark Mode Methods
    applyDarkMode() {
        if (this.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('darkMode', this.darkMode);
        this.applyDarkMode();
        const icon = this.darkMode ? '☀️' : '🌙';
        document.getElementById('darkModeToggle').textContent = icon;
    }

    // Export/Import Methods
    exportTasks(format) {
        if (this.tasks.length === 0) {
            this.showNotification('No tasks to export!', 'warning');
            return;
        }

        if (format === 'json') {
            this.exportToJSON();
        } else if (format === 'csv') {
            this.exportToCSV();
        }
    }

    exportToJSON() {
        const dataStr = JSON.stringify(this.tasks, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        this.downloadFile(blob, `tasks_${this.getTimestamp()}.json`);
        this.showNotification('Tasks exported as JSON!', 'success');
    }

    exportToCSV() {
        const headers = ['Title', 'Description', 'Date & Time', 'Category', 'Priority', 'Completed', 'Tags'];
        const rows = this.tasks.map(task => [
            task.title,
            task.description || '',
            task.dateTime,
            task.category,
            task.priority,
            task.completed ? 'Yes' : 'No',
            (task.tags || []).join('; ')
        ]);

        let csv = headers.join(',') + '\\n';
        rows.forEach(row => {
            csv += row.map(field => `\"${String(field).replace(/\"/g, '\"\"')}\"`).join(',') + '\\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        this.downloadFile(blob, `tasks_${this.getTimestamp()}.csv`);
        this.showNotification('Tasks exported as CSV!', 'success');
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    getTimestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    }

    importTasks(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                let importedTasks = [];

                if (file.name.endsWith('.json')) {
                    importedTasks = JSON.parse(content);
                } else if (file.name.endsWith('.csv')) {
                    importedTasks = this.parseCSV(content);
                }

                if (!Array.isArray(importedTasks) || importedTasks.length === 0) {
                    this.showNotification('No valid tasks found in file!', 'error');
                    return;
                }

                const confirmed = confirm(`Import ${importedTasks.length} tasks? This will add to your existing tasks.`);
                if (confirmed) {
                    importedTasks.forEach(task => {
                        task.id = Date.now() + Math.random();
                        task.notifiedReminder = false;
                        task.notifiedSoon = false;
                        task.notifiedOverdue = false;
                    });
                    
                    this.tasks = [...this.tasks, ...importedTasks];
                    this.saveTasks();
                    this.renderTasks();
                    this.showNotification(`Imported ${importedTasks.length} tasks successfully!`, 'success');
                }
            } catch (error) {
                console.error('Import error:', error);
                this.showNotification('Failed to import tasks. Invalid file format.', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    parseCSV(csv) {
        const lines = csv.split('\\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const tasks = [];
        for (let i = 1; i < lines.length; i++) {
            const matches = lines[i].match(/\"([^\"]*)\"/g);
            if (!matches || matches.length < 6) continue;

            const values = matches.map(m => m.slice(1, -1).replace(/\"\"/g, '\"'));
            tasks.push({
                title: values[0],
                description: values[1],
                dateTime: values[2],
                category: values[3],
                priority: values[4],
                completed: values[5] === 'Yes',
                tags: values[6] ? values[6].split('; ') : [],
                reminder: 'none',
                recurring: null,
                attachments: [],
                subtasks: []
            });
        }
        return tasks;
    }

    // Analytics Methods
    updateAnalytics() {
        this.updateCompletionRate();
        this.updateCategoryChart();
        this.updatePriorityChart();
        this.updateWeeklyChart();
        this.updateProductivityInsights();
    }

    updateCompletionRate() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        const rateElement = document.getElementById('completionRate');
        if (rateElement) {
            rateElement.textContent = rate + '%';
        }
    }

    updateCategoryChart() {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const categories = {};
        
        this.tasks.forEach(task => {
            categories[task.category] = (categories[task.category] || 0) + 1;
        });

        this.drawPieChart(ctx, categories, canvas.width, canvas.height);
    }

    updatePriorityChart() {
        const canvas = document.getElementById('priorityChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const priorities = { High: 0, Medium: 0, Low: 0 };
        
        this.tasks.filter(t => !t.completed).forEach(task => {
            priorities[task.priority]++;
        });

        this.drawBarChart(ctx, priorities, canvas.width, canvas.height);
    }

    updateWeeklyChart() {
        const canvas = document.getElementById('weeklyChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const weekData = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        this.tasks.filter(t => t.completed).forEach(task => {
            const date = new Date(task.dateTime);
            const dayName = days[date.getDay()];
            weekData[dayName]++;
        });

        this.drawLineChart(ctx, weekData, canvas.width, canvas.height);
    }

    drawPieChart(ctx, data, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 10;
        
        const colors = ['#4A90E2', '#50C878', '#E74C3C', '#F39C12', '#9B59B6', '#95A5A6'];
        const total = Object.values(data).reduce((a, b) => a + b, 0);
        
        if (total === 0) {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#999';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No data', centerX, centerY);
            return;
        }

        let startAngle = 0;
        Object.entries(data).forEach(([label, value], index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            
            ctx.fillStyle = colors[index % colors.length];
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fill();
            
            startAngle += sliceAngle;
        });
    }

    drawBarChart(ctx, data, width, height) {
        ctx.clearRect(0, 0, width, height);
        
        const entries = Object.entries(data);
        const max = Math.max(...Object.values(data), 1);
        const barWidth = width / entries.length - 20;
        const colors = { High: '#E74C3C', Medium: '#F39C12', Low: '#3498DB' };
        
        entries.forEach(([label, value], index) => {
            const barHeight = (value / max) * (height - 40);
            const x = index * (barWidth + 20) + 10;
            const y = height - barHeight - 20;
            
            ctx.fillStyle = colors[label] || '#4A90E2';
            ctx.fillRect(x, y, barWidth, barHeight);
            
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, x + barWidth / 2, height - 5);
            ctx.fillText(value, x + barWidth / 2, y - 5);
        });
    }

    drawLineChart(ctx, data, width, height) {
        ctx.clearRect(0, 0, width, height);
        
        const entries = Object.entries(data);
        const max = Math.max(...Object.values(data), 1);
        const stepX = width / (entries.length - 1 || 1);
        
        ctx.strokeStyle = '#4A90E2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        entries.forEach(([label, value], index) => {
            const x = index * stepX;
            const y = height - 30 - (value / max) * (height - 50);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            ctx.fillStyle = '#4A90E2';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.fillStyle = '#333';
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, height - 10);
        });
        
        ctx.strokeStyle = '#4A90E2';
        ctx.stroke();
    }

    updateProductivityInsights() {
        const container = document.getElementById('productivityInsights');
        if (!container) return;

        const insights = [];
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const now = new Date();
        const overdue = this.tasks.filter(t => !t.completed && new Date(t.dateTime) < now).length;
        
        if (total === 0) {
            insights.push({ icon: '📝', text: 'No tasks yet. <strong>Create your first task</strong> to get started!' });
        } else {
            const rate = Math.round((completed / total) * 100);
            
            if (rate >= 80) {
                insights.push({ icon: '🎉', text: `Amazing! You've completed <strong>${rate}%</strong> of your tasks!` });
            } else if (rate >= 50) {
                insights.push({ icon: '💪', text: `Good progress! <strong>${rate}%</strong> completion rate. Keep going!` });
            } else {
                insights.push({ icon: '⚡', text: `You have <strong>${pending} pending tasks</strong>. Let's tackle them!` });
            }
            
            if (overdue > 0) {
                insights.push({ icon: '⚠️', text: `You have <strong>${overdue} overdue task${overdue > 1 ? 's' : ''}</strong>. Prioritize them!` });
            }
            
            const highPriority = this.tasks.filter(t => !t.completed && t.priority === 'High').length;
            if (highPriority > 0) {
                insights.push({ icon: '🔥', text: `<strong>${highPriority} high-priority task${highPriority > 1 ? 's' : ''}</strong> need${highPriority === 1 ? 's' : ''} your attention!` });
            }
            
            const todayTasks = this.tasks.filter(t => {
                const taskDate = new Date(t.dateTime);
                return !t.completed && taskDate.toDateString() === now.toDateString();
            }).length;
            
            if (todayTasks > 0) {
                insights.push({ icon: '📅', text: `You have <strong>${todayTasks} task${todayTasks > 1 ? 's' : ''} due today</strong>. Stay focused!` });
            }
        }
        
        container.innerHTML = insights.map(insight => `
            <div class=\"insight-item\">
                <span class=\"insight-icon\">${insight.icon}</span>
                <p class=\"insight-text\">${insight.text}</p>
            </div>
        `).join('');
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
            createdAt: new Date().toISOString(),
            recurring: task.recurring || null,
            attachments: task.attachments || [],
            subtasks: task.subtasks || []
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
            
            // Handle recurring tasks
            if (task.completed && task.recurring) {
                this.createNextRecurrence(task);
            }
            
            this.saveTasks();
            this.renderTasks();
            this.showNotification(task.completed ? 'Task completed! 🎉' : 'Task marked as incomplete', 'success');
        }
    }

    createNextRecurrence(task) {
        const currentDate = new Date(task.dateTime);
        let nextDate = new Date(currentDate);
        
        const interval = task.recurring.interval || 1;
        
        switch(task.recurring.type) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + interval);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + (7 * interval));
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + interval);
                break;
            case 'custom':
                nextDate.setDate(nextDate.getDate() + interval);
                break;
        }
        
        // Check if we've passed the end date
        if (task.recurring.endDate) {
            const endDate = new Date(task.recurring.endDate);
            if (nextDate > endDate) {
                console.log('Recurring task ended');
                return;
            }
        }
        
        // Create the next occurrence
        const nextTask = {
            ...task,
            id: Date.now(),
            dateTime: nextDate.toISOString().slice(0, 16),
            completed: false,
            notifiedReminder: false,
            notifiedSoon: false,
            notifiedOverdue: false,
            createdAt: new Date().toISOString()
        };
        
        this.tasks.push(nextTask);
        this.showNotification('Next occurrence created for recurring task', 'info');
    }

    addSubtask(taskId, subtaskText) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            if (!task.subtasks) task.subtasks = [];
            task.subtasks.push({
                id: Date.now(),
                text: subtaskText,
                completed: false
            });
            this.saveTasks();
            this.renderTasks();
        }
    }

    toggleSubtask(taskId, subtaskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.subtasks) {
            const subtask = task.subtasks.find(st => st.id === subtaskId);
            if (subtask) {
                subtask.completed = !subtask.completed;
                this.saveTasks();
                this.renderTasks();
            }
        }
    }

    deleteSubtask(taskId, subtaskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.subtasks) {
            task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
            this.saveTasks();
            this.renderTasks();
        }
    }

    deleteAttachment(taskId, attachmentIndex) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.attachments) {
            task.attachments.splice(attachmentIndex, 1);
            this.saveTasks();
            this.renderTasks();
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

        const recurringText = task.recurring
            ? `<span class="recurring-badge">🔁 ${task.recurring.type === 'custom' ? 'Every ' + task.recurring.interval + ' days' : task.recurring.type}</span>`
            : '';

        const attachmentsHTML = task.attachments && task.attachments.length > 0
            ? `<div class="task-attachments">
                ${task.attachments.map((att, idx) => `
                    <div class="attachment-item">
                        <span class="attachment-icon">📎</span>
                        <a href="${att.data}" download="${att.name}" class="attachment-link">${att.name}</a>
                        <button class="btn-delete-attachment" onclick="taskManager.deleteAttachment(${task.id}, ${idx})" title="Delete attachment">×</button>
                    </div>
                `).join('')}
               </div>`
            : '';

        const subtasksHTML = task.subtasks && task.subtasks.length > 0
            ? `<div class="subtasks-container">
                <h4 class="subtasks-title">Subtasks (${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length})</h4>
                <div class="subtasks-list">
                    ${task.subtasks.map(st => `
                        <div class="subtask-item ${st.completed ? 'completed' : ''}">
                            <input type="checkbox" ${st.completed ? 'checked' : ''} 
                                   onchange="taskManager.toggleSubtask(${task.id}, ${st.id})">
                            <span class="subtask-text">${st.text}</span>
                            <button class="btn-delete-subtask" onclick="taskManager.deleteSubtask(${task.id}, ${st.id})" title="Delete subtask">×</button>
                        </div>
                    `).join('')}
                </div>
                <div class="add-subtask-container">
                    <input type="text" class="subtask-input" id="subtask-${task.id}" placeholder="Add subtask...">
                    <button class="btn-add-subtask" onclick="taskManager.addSubtaskFromInput(${task.id})">+</button>
                </div>
               </div>`
            : `<div class="add-subtask-container">
                <input type="text" class="subtask-input" id="subtask-${task.id}" placeholder="Add subtask...">
                <button class="btn-add-subtask" onclick="taskManager.addSubtaskFromInput(${task.id})">+</button>
               </div>`;

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
                    ${recurringText}
                </div>
                ${timeText}
                ${attachmentsHTML}
                ${subtasksHTML}
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

        // Handle recurring task fields
        const isRecurring = task.recurring !== null && task.recurring !== undefined;
        document.getElementById('editIsRecurring').checked = isRecurring;
        document.getElementById('editRecurringOptions').style.display = isRecurring ? 'block' : 'none';
        
        if (isRecurring) {
            document.getElementById('editRecurringType').value = task.recurring.type || 'daily';
            document.getElementById('editRecurringInterval').value = task.recurring.interval || 1;
            document.getElementById('editRecurringEnd').value = task.recurring.endDate || '';
        }

        // Display current attachments
        const attachmentsContainer = document.getElementById('currentAttachments');
        if (task.attachments && task.attachments.length > 0) {
            attachmentsContainer.innerHTML = '<h4>Current Attachments:</h4>' + 
                task.attachments.map((att, idx) => `
                    <div class="attachment-preview">
                        <span>📎 ${att.name}</span>
                        <button type="button" class="btn-remove" onclick="taskManager.deleteAttachment(${task.id}, ${idx}); taskManager.openEditModal(${task.id});">Remove</button>
                    </div>
                `).join('');
        } else {
            attachmentsContainer.innerHTML = '';
        }

        document.getElementById('editModal').style.display = 'block';
    }

    addSubtaskFromInput(taskId) {
        const input = document.getElementById(`subtask-${taskId}`);
        const text = input.value.trim();
        if (text) {
            this.addSubtask(taskId, text);
            input.value = '';
        }
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

    async handleFileUpload(files) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const attachments = [];
        
        for (let file of files) {
            if (file.size > maxSize) {
                this.showNotification(`File ${file.name} is too large. Max size is 5MB.`, 'warning');
                continue;
            }
            
            try {
                const data = await this.fileToBase64(file);
                attachments.push({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: data
                });
            } catch (error) {
                this.showNotification(`Failed to upload ${file.name}`, 'error');
            }
        }
        
        return attachments;
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    attachEventListeners() {
        // Dark Mode Toggle
        document.getElementById('darkModeToggle').addEventListener('click', () => {
            this.toggleDarkMode();
        });

        // Analytics Toggle
        document.getElementById('toggleAnalytics').addEventListener('click', (e) => {
            const content = document.getElementById('analyticsContent');
            const button = e.target;
            
            if (content.style.display === 'none') {
                content.style.display = 'block';
                button.textContent = 'Hide Analytics';
                this.updateAnalytics();
            } else {
                content.style.display = 'none';
                button.textContent = 'Show Analytics';
            }
        });

        // Toggle recurring options visibility
        document.getElementById('isRecurring').addEventListener('change', (e) => {
            document.getElementById('recurringOptions').style.display = e.target.checked ? 'block' : 'none';
        });

        document.getElementById('editIsRecurring').addEventListener('change', (e) => {
            document.getElementById('editRecurringOptions').style.display = e.target.checked ? 'block' : 'none';
        });

        document.getElementById('taskForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const isRecurring = document.getElementById('isRecurring').checked;
            const files = document.getElementById('attachments').files;
            const attachments = files.length > 0 ? await this.handleFileUpload(files) : [];
            
            const task = {
                title: document.getElementById('title').value,
                description: document.getElementById('description').value,
                dateTime: document.getElementById('dateTime').value,
                category: document.getElementById('category').value,
                priority: document.getElementById('priority').value,
                reminder: document.getElementById('reminder').value,
                tags: this.parseTags(document.getElementById('tags').value),
                attachments: attachments,
                recurring: isRecurring ? {
                    type: document.getElementById('recurringType').value,
                    interval: parseInt(document.getElementById('recurringInterval').value) || 1,
                    endDate: document.getElementById('recurringEnd').value || null
                } : null
            };
            this.addTask(task);
            e.target.reset();
            document.getElementById('recurringOptions').style.display = 'none';
        });

        document.getElementById('editTaskForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = parseInt(document.getElementById('editTaskId').value);
            const task = this.tasks.find(t => t.id === id);
            
            const isRecurring = document.getElementById('editIsRecurring').checked;
            const files = document.getElementById('editAttachments').files;
            const newAttachments = files.length > 0 ? await this.handleFileUpload(files) : [];
            
            const updatedTask = {
                title: document.getElementById('editTitle').value,
                description: document.getElementById('editDescription').value,
                dateTime: document.getElementById('editDateTime').value,
                category: document.getElementById('editCategory').value,
                priority: document.getElementById('editPriority').value,
                reminder: document.getElementById('editReminder').value,
                tags: this.parseTags(document.getElementById('editTags').value),
                attachments: [...(task.attachments || []), ...newAttachments],
                recurring: isRecurring ? {
                    type: document.getElementById('editRecurringType').value,
                    interval: parseInt(document.getElementById('editRecurringInterval').value) || 1,
                    endDate: document.getElementById('editRecurringEnd').value || null
                } : null
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
