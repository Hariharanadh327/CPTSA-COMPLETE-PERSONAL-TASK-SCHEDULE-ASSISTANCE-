# CPTSA - Complete Personal Task Schedule Assistance

This project will help to schedule your daily tasks and get notified or alerts before their start time.

## 🌟 Features

- ✅ **Task Management**: Create, edit, and manage tasks with ease
- 🔔 **Smart Reminders**: Get notified before task deadlines
- 📊 **Analytics Dashboard**: Track your productivity and completion rates
- 🏷️ **Categories & Priorities**: Organize tasks by category and priority
- 🔁 **Recurring Tasks**: Set up tasks that repeat daily, weekly, or monthly
- 📎 **Attachments**: Add files and documents to your tasks
- 🌓 **Dark Mode**: Easy on the eyes with dark mode support
- 💾 **Export/Import**: Backup and restore your tasks in JSON or CSV format

## 🤖 Automated Daily Activities

This workflow automates your daily activities with GitHub Actions! The following workflows run automatically:

### 📅 Daily Automation (8:00 AM UTC)
- **Workflow**: `.github/workflows/daily-automation.yml`
- **Schedule**: Every day at 8:00 AM
- **Purpose**: Runs daily health checks, verifies application integrity, and provides a daily summary
- **Trigger**: Automatic (scheduled) or manual via workflow dispatch

### ☀️ Morning Reminder (6:00 AM UTC)
- **Workflow**: `.github/workflows/morning-reminder.yml`
- **Schedule**: Every day at 6:00 AM
- **Purpose**: Sends morning greetings, motivational quotes, and daily task checklist
- **Trigger**: Automatic (scheduled) or manual via workflow dispatch

### 🌤️ Productivity Check (12:00 PM UTC, Weekdays)
- **Workflow**: `.github/workflows/productivity-check.yml`
- **Schedule**: Monday-Friday at 12:00 PM
- **Purpose**: Midday progress review, afternoon planning, and break reminders
- **Trigger**: Automatic (scheduled) or manual via workflow dispatch

### 🌙 Evening Summary (6:00 PM UTC)
- **Workflow**: `.github/workflows/evening-summary.yml`
- **Schedule**: Every day at 6:00 PM
- **Purpose**: End-of-day reflection, tomorrow's preparation, and wellness reminders
- **Trigger**: Automatic (scheduled) or manual via workflow dispatch

### 🧹 Weekly Maintenance (Sunday 9:00 AM UTC)
- **Workflow**: `.github/workflows/weekly-maintenance.yml`
- **Schedule**: Every Sunday at 9:00 AM
- **Purpose**: Code quality checks, repository statistics, and weekly recommendations
- **Trigger**: Automatic (scheduled) or manual via workflow dispatch

## 🚀 Getting Started

1. **Open the Application**: Simply open `index.html` in your web browser
2. **Create an Account**: Use the login page to create your account (demo mode - any username/password)
3. **Add Tasks**: Click "Add New Task" and fill in the details
4. **Set Reminders**: Enable browser notifications for task reminders
5. **Stay Organized**: Use categories, priorities, and tags to organize your tasks

## 📱 Usage

### Adding a Task
1. Fill in the task title and description
2. Select date, time, category, and priority
3. Set a reminder (optional)
4. Add tags for better organization
5. Upload attachments if needed
6. Enable recurring if the task repeats

### Managing Tasks
- **Complete**: Click the "✓ Complete" button
- **Edit**: Click the "✏️ Edit" button to modify task details
- **Delete**: Click the "🗑️ Delete" button to remove the task
- **Filter**: Use filter buttons to view specific task categories

### Viewing Analytics
- Click "Show Analytics" to view your productivity insights
- See completion rates, task distribution, and weekly progress
- Get personalized productivity recommendations

## 🔔 Notifications

Enable browser notifications to receive:
- Reminder alerts before tasks start
- Overdue task warnings
- Task completion confirmations

## 💾 Data Management

- **Export**: Download your tasks as JSON or CSV
- **Import**: Upload previously exported task files
- **Backup**: All data is stored in your browser's local storage

## 🛠️ Manual Workflow Triggers

You can manually trigger any automation workflow:

1. Go to the **Actions** tab in GitHub
2. Select the workflow you want to run
3. Click **Run workflow**
4. Choose the branch and click **Run workflow**

## 📄 License

This project is open source and available for personal use.

## 🤝 Contributing

Feel free to fork this project and submit pull requests for improvements!
