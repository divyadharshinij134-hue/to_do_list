// Authentication page JavaScript
document.addEventListener('DOMContentLoaded', () => {
    const loginTab = document.querySelector('[data-tab="login"]');
    const signupTab = document.querySelector('[data-tab="signup"]');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginFormElement = document.getElementById('loginFormElement');
    const signupFormElement = document.getElementById('signupFormElement');

    // Tab switching
    loginTab.addEventListener('click', () => {
        switchTab('login');
    });

    signupTab.addEventListener('click', () => {
        switchTab('signup');
    });

    function switchTab(tab) {
        // Update tabs
        loginTab.classList.toggle('active', tab === 'login');
        signupTab.classList.toggle('active', tab === 'signup');

        // Update forms
        loginForm.classList.toggle('active', tab === 'login');
        signupForm.classList.toggle('active', tab === 'signup');

        // Clear forms
        if (tab === 'login') {
            signupFormElement.reset();
        } else {
            loginFormElement.reset();
        }

        // Remove any error messages
        removeMessages();
    }

    // Password toggle functionality
    const passwordToggles = {
        login: document.getElementById('toggleLoginPassword'),
        signup: document.getElementById('toggleSignupPassword'),
        confirm: document.getElementById('toggleConfirmPassword')
    };

    passwordToggles.login?.addEventListener('click', () => {
        togglePassword('loginPassword', passwordToggles.login);
    });

    passwordToggles.signup?.addEventListener('click', () => {
        togglePassword('signupPassword', passwordToggles.signup);
    });

    passwordToggles.confirm?.addEventListener('click', () => {
        togglePassword('confirmPassword', passwordToggles.confirm);
    });

    function togglePassword(inputId, button) {
        const input = document.getElementById(inputId);
        if (input.type === 'password') {
            input.type = 'text';
            button.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
            `;
        } else {
            input.type = 'password';
            button.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            `;
        }
    }

    // Form submission handlers
    loginFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        removeMessages();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!email || !password) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        try {
            // Simulate API call - replace with actual authentication
            await handleLogin(email, password, rememberMe);
        } catch (error) {
            showMessage(error.message || 'Login failed. Please try again.', 'error');
        }
    });

    signupFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        removeMessages();

        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;

        // Validation
        if (!name || !email || !password || !confirmPassword) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        if (password.length < 6) {
            showMessage('Password must be at least 6 characters', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }

        if (!agreeTerms) {
            showMessage('Please agree to the Terms of Service and Privacy Policy', 'error');
            return;
        }

        try {
            // Simulate API call - replace with actual authentication
            await handleSignup(name, email, password);
        } catch (error) {
            showMessage(error.message || 'Sign up failed. Please try again.', 'error');
        }
    });

    // Authentication handlers (replace with actual API calls)
    async function handleLogin(email, password, rememberMe) {
        // TODO: Replace with actual API call
        // For now, simulate login success
        showMessage('Login successful! Redirecting...', 'success');
        
        const derivedUserId = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');

        // Store user info in localStorage
        localStorage.setItem('userName', email.split('@')[0]);
        localStorage.setItem('userId', derivedUserId);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
        updateLoginStreak(derivedUserId);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Redirect to dashboard
        window.location.href = '/dashboard.html';
    }

    async function handleSignup(name, email, password) {
        // TODO: Replace with actual API call
        // For now, simulate signup success
        showMessage('Account created successfully! Redirecting...', 'success');
        
        const derivedUserId = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');

        // Store user info in localStorage
        localStorage.setItem('userName', name);
        localStorage.setItem('userId', derivedUserId);
        localStorage.setItem('isLoggedIn', 'true');
        updateLoginStreak(derivedUserId);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Redirect to dashboard
        window.location.href = '/dashboard.html';
    }

    // Message display functions
    function showMessage(message, type) {
        removeMessages();

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type} show`;
        messageDiv.textContent = message;

        const activeForm = document.querySelector('.auth-form.active');
        const formElement = activeForm.querySelector('.auth-form-element');
        formElement.insertBefore(messageDiv, formElement.firstChild);

        // Auto-remove success messages after redirect
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.remove();
            }, 2000);
        }
    }

    function removeMessages() {
        const messages = document.querySelectorAll('.message');
        messages.forEach(msg => msg.remove());
    }

    // Google sign-in (placeholder)
    document.querySelectorAll('.btn-social').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            showMessage('Google sign-in will be implemented soon', 'error');
        });
    });

    // Forgot password (placeholder)
    document.querySelector('.forgot-password')?.addEventListener('click', (e) => {
        e.preventDefault();
        showMessage('Password reset functionality will be implemented soon', 'error');
    });

    function updateLoginStreak(userId) {
        if (!userId) return;
        const key = `loginStreak:${userId}`;
        const today = new Date();
        const todayKey = today.toISOString().split('T')[0];
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        let { count = 0, lastDate = null, best = 0 } = stored;

        if (!lastDate) {
            count = 1;
        } else {
            const diff = calculateDayDifference(lastDate, todayKey);
            if (diff === 0) {
                // already counted today, keep count
            } else if (diff === 1) {
                count += 1;
            } else if (diff > 1) {
                count = 1;
            }
        }

        best = Math.max(best || 0, count);

        const payload = { count, lastDate: todayKey, best };
        localStorage.setItem(key, JSON.stringify(payload));
        localStorage.setItem('activeLoginStreak', String(count));
        localStorage.setItem('bestLoginStreak', String(best));
    }

    function calculateDayDifference(previous, current) {
        const prevTime = dateKeyToUTC(previous);
        const currentTime = dateKeyToUTC(current);
        return Math.floor((currentTime - prevTime) / (1000 * 60 * 60 * 24));
    }

    function dateKeyToUTC(dateKey) {
        const [year, month, day] = dateKey.split('-').map(Number);
        return Date.UTC(year, month - 1, day);
    }
});

