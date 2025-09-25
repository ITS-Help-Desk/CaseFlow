const loginContainer = document.createElement('div');
loginContainer.className = 'login-container';

// Import API configuration
const { API_BASE_URL } = require('../config.js');

// Create the form container
const loginFormContainer = document.createElement('div');
loginFormContainer.className = 'login-form-container';

const loginForm = document.createElement('form');
loginForm.className = 'login-form';

// Add logo/title section
const logoSection = document.createElement('div');
logoSection.className = 'login-logo';
const title = document.createElement('h1');
title.textContent = 'CaseFlow';
logoSection.appendChild(title);

// Add form toggle
const formToggle = document.createElement('div');
formToggle.className = 'form-toggle';
const loginToggle = document.createElement('button');
loginToggle.textContent = 'Sign in';
loginToggle.className = 'toggle-btn active';
const signupToggle = document.createElement('button');
signupToggle.textContent = 'Sign Up';
signupToggle.className = 'toggle-btn';
formToggle.appendChild(loginToggle);
formToggle.appendChild(signupToggle);

// Add error message container
const errorContainer = document.createElement('div');
errorContainer.className = 'login-error';
errorContainer.style.display = 'none';

// Username input group
const usernameGroup = document.createElement('div');
usernameGroup.className = 'input-group';

const usernameInput = document.createElement('input');
usernameInput.type = 'text';
usernameInput.placeholder = 'Username';
usernameInput.className = 'login-input';
usernameInput.id = 'username';
usernameGroup.appendChild(usernameInput);

// Password input group
const passwordGroup = document.createElement('div');
passwordGroup.className = 'input-group';

const passwordInput = document.createElement('input');
passwordInput.type = 'password';
passwordInput.placeholder = 'Password';
passwordInput.className = 'login-input';
passwordInput.id = 'password';
passwordGroup.appendChild(passwordInput);

// Additional signup fields in groups
const fullNameGroup = document.createElement('div');
fullNameGroup.className = 'input-group';
const fullNameInput = document.createElement('input');
fullNameInput.type = 'text';
fullNameInput.placeholder = 'Enter your full name';
fullNameInput.className = 'login-input signup-field';
fullNameInput.style.display = 'none';
fullNameGroup.appendChild(fullNameInput);

const emailGroup = document.createElement('div');
emailGroup.className = 'input-group';
emailGroup.id = 'email-input-group';
const emailInput = document.createElement('input');
emailInput.type = 'email';
emailInput.placeholder = 'Enter your email';
emailInput.className = 'login-input signup-field';
emailInput.style.display = 'none';
emailGroup.appendChild(emailInput);

const confirmPasswordGroup = document.createElement('div');
confirmPasswordGroup.className = 'input-group';
const confirmPasswordInput = document.createElement('input');
confirmPasswordInput.type = 'password';
confirmPasswordInput.placeholder = 'Confirm your password';
confirmPasswordInput.className = 'login-input signup-field';
confirmPasswordInput.style.display = 'none';
confirmPasswordGroup.appendChild(confirmPasswordInput);

// Add listener to password input for Enter key press
passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default Enter behavior (like newline)
        loginButton.click(); // Trigger the login button click
    }
});

const loginButtonContainer = document.createElement('div');
loginButtonContainer.className = 'login-button-container';

const loginButton = document.createElement('button');
loginButton.textContent = 'Sign in';
loginButton.className = 'login-button';
loginButton.type = 'submit';

loginButtonContainer.appendChild(loginButton);

// Add elements to form
loginForm.appendChild(logoSection);
loginForm.appendChild(formToggle);
loginForm.appendChild(errorContainer);
loginForm.appendChild(fullNameGroup);
loginForm.appendChild(emailGroup);
loginForm.appendChild(usernameGroup);
loginForm.appendChild(passwordGroup);
loginForm.appendChild(confirmPasswordGroup);
loginForm.appendChild(loginButtonContainer);

// Add form to form container
loginFormContainer.appendChild(loginForm);

// Create the content area
const loginContent = document.createElement('div');
loginContent.className = 'login-content';

// Add containers to main container
loginContainer.appendChild(loginFormContainer);
loginContainer.appendChild(loginContent);

// Toggle between login and signup
let isLoginMode = true;

loginToggle.addEventListener('click', (e) => {
    e.preventDefault();
    if (!isLoginMode) {
        toggleForm('login');
    }
});

signupToggle.addEventListener('click', (e) => {
    e.preventDefault();
    if (isLoginMode) {
        toggleForm('signup');
    }
});

function toggleForm(mode) {
    isLoginMode = mode === 'login';
    loginToggle.classList.toggle('active', isLoginMode);
    signupToggle.classList.toggle('active', !isLoginMode);
    
    const signupFields = loginForm.querySelectorAll('.signup-field');
    signupFields.forEach(field => {
        field.style.display = isLoginMode ? 'none' : 'block';
    });
    
    // Update the button text and class for proper styling
    loginButton.textContent = isLoginMode ? 'Sign in' : 'Sign up';
    loginButton.className = isLoginMode ? 'login-button' : 'login-button signup-button';
    errorContainer.style.display = 'none';
}

// Handle form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value;
    const password = passwordInput.value;
    
    // Basic validation
    if (!username || !password) {
        showError('Please fill in all fields');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }

    if (!isLoginMode) {
        // Additional signup validation
        const fullName = fullNameInput.value;
        const email = emailInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!fullName || !email) {
            showError('Please fill in all fields');
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            showError('Please enter a valid email address');
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        if (fullName.trim().split(' ').length < 2) {
            showError('Please enter both first and last name');
            return;
        }
    }

    // Add loading state
    loginButton.disabled = true;
    loginButton.textContent = isLoginMode ? 'Signing in...' : 'Signing up...';
    
    try {
        const endpoint = isLoginMode ? '/api/user/login/' : '/api/user/signup/';
        let requestBody = {
            username: username.trim(),
            password: password
        };

        if (!isLoginMode) {
            // Add signup-specific fields exactly as specified in the API
            const [firstName, ...lastNameParts] = fullNameInput.value.trim().split(' ');
            requestBody = {
                username: username.trim(),
                password: password,
                email: emailInput.value.trim(),
                first_name: firstName,
                last_name: lastNameParts.join(' ')
            };
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || errorData.message || 'Authentication failed');
        }

        const data = await response.json();
        
        // Store the authentication token
        if (!data.token) {
            throw new Error('No authentication token received');
        }
        
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', username);
        
        // Hide login and show main content
        loginContainer.style.display = 'none';
        document.getElementById('main-container').style.display = 'flex';
        
    } catch (error) {
        showError(error.message || 'An error occurred. Please try again.');
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = isLoginMode ? 'Sign in' : 'Sign up';
    }
});

function showError(message) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    setTimeout(() => {
        errorContainer.style.display = 'none';
    }, 3000);
}

export function createLoginPage() {
    return loginContainer;
} 