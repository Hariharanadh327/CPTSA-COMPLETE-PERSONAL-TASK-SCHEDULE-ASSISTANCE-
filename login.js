// Login/Register Tab Switching
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');

// Tab switching functionality
loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    clearErrors();
});

registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
    clearErrors();
});

// Clear error messages
function clearErrors() {
    loginError.textContent = '';
    loginError.classList.remove('show');
    registerError.textContent = '';
    registerError.classList.remove('show');
}

// Show error message
function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
}

// Login Form Submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    // Get users from localStorage
    const users = JSON.parse(localStorage.getItem('users')) || {};

    // Check if user exists and password matches
    if (users[username] && users[username].password === password) {
        // Record login date
        const loginDate = new Date().toISOString();
        
        // Create session
        const session = {
            username: username,
            email: users[username].email,
            loginDate: loginDate,
            rememberMe: rememberMe
        };

        // Store session
        if (rememberMe) {
            localStorage.setItem('currentUser', JSON.stringify(session));
        } else {
            sessionStorage.setItem('currentUser', JSON.stringify(session));
        }

        // Update user's last login
        users[username].lastLogin = loginDate;
        users[username].loginHistory = users[username].loginHistory || [];
        users[username].loginHistory.push(loginDate);
        localStorage.setItem('users', JSON.stringify(users));

        // Show success message and redirect
        showSuccess('Login successful! Redirecting...');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } else {
        showError(loginError, 'Invalid username or password');
    }
});

// Register Form Submission
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    // Validation
    if (username.length < 3) {
        showError(registerError, 'Username must be at least 3 characters long');
        return;
    }

    if (password.length < 6) {
        showError(registerError, 'Password must be at least 6 characters long');
        return;
    }

    if (password !== confirmPassword) {
        showError(registerError, 'Passwords do not match');
        return;
    }

    // Get existing users
    const users = JSON.parse(localStorage.getItem('users')) || {};

    // Check if username already exists
    if (users[username]) {
        showError(registerError, 'Username already exists');
        return;
    }

    // Create new user with registration date
    const registrationDate = new Date().toISOString();
    users[username] = {
        email: email,
        password: password,
        registrationDate: registrationDate,
        lastLogin: null,
        loginHistory: []
    };

    // Save users
    localStorage.setItem('users', JSON.stringify(users));

    // Show success and switch to login
    showSuccess('Registration successful! Please login.');
    setTimeout(() => {
        loginTab.click();
        document.getElementById('loginUsername').value = username;
    }, 1500);
});

// Show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'error-message show';
    successDiv.style.background = 'rgba(80, 200, 120, 0.1)';
    successDiv.style.color = '#50C878';
    successDiv.style.borderColor = 'rgba(80, 200, 120, 0.2)';
    successDiv.textContent = message;
    
    const activeForm = loginForm.style.display !== 'none' ? loginForm : registerForm;
    activeForm.appendChild(successDiv);
}

// Check if user is already logged in
window.addEventListener('load', () => {
    const currentUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (currentUser) {
        // User is already logged in, redirect to app
        window.location.href = 'index.html';
    }
});
