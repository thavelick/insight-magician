export class LoginComponent {
  constructor(authService) {
    this.authService = authService;
    this.element = null;
    this.isLoading = false;
  }

  render() {
    if (this.element) {
      return this.element;
    }

    this.element = document.createElement('div');
    this.element.className = 'login-container';
    this.element.innerHTML = this._getHTML();
    
    this._attachEventListeners();
    
    return this.element;
  }

  _getHTML() {
    return `
      <div class="login-card">
        <div class="login-header">
          <h1>Insight Magician</h1>
          <p>Sign in to access your data dashboard</p>
        </div>
        
        <form class="login-form" id="loginForm">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              required 
              placeholder="Enter your email address"
              autocomplete="email"
            />
          </div>
          
          <button type="submit" class="login-button" id="loginButton">
            <span class="button-text">Send Magic Link</span>
            <span class="button-loading" style="display: none;">
              <span class="spinner"></span>
              Sending...
            </span>
          </button>
        </form>
        
        <div class="login-message" id="loginMessage" style="display: none;"></div>
        
        <div class="login-help">
          <p>We'll send you a secure magic link to sign in. No passwords required!</p>
        </div>
      </div>
    `;
  }

  _attachEventListeners() {
    const form = this.element.querySelector('#loginForm');
    const emailInput = this.element.querySelector('#email');
    const submitButton = this.element.querySelector('#loginButton');
    const messageDiv = this.element.querySelector('#loginMessage');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (this.isLoading) {
        return;
      }

      const email = emailInput.value.trim();
      if (!email) {
        this._showMessage('Please enter your email address', 'error');
        return;
      }

      if (!this._isValidEmail(email)) {
        this._showMessage('Please enter a valid email address', 'error');
        return;
      }

      await this._handleLogin(email);
    });

    // Real-time email validation
    emailInput.addEventListener('input', () => {
      this._clearMessage();
    });

    // Clear message when user starts typing
    emailInput.addEventListener('focus', () => {
      this._clearMessage();
    });
  }

  async _handleLogin(email) {
    this._setLoading(true);
    this._clearMessage();

    try {
      const result = await this.authService.login(email);

      if (result.success) {
        this._showMessage(
          `Magic link sent to ${result.email}. Please check your email and click the link to sign in.`,
          'success'
        );
        
        // Clear the form
        this.element.querySelector('#email').value = '';
        
        // Show instructions for checking email
        this._showEmailInstructions(result.email);
      } else {
        this._showMessage(result.error || 'Failed to send magic link', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      this._showMessage('An unexpected error occurred. Please try again.', 'error');
    } finally {
      this._setLoading(false);
    }
  }

  _showEmailInstructions(email) {
    const instructions = document.createElement('div');
    instructions.className = 'email-instructions';
    instructions.innerHTML = `
      <div class="email-instructions-content">
        <h3>Check your email!</h3>
        <p>We sent a magic link to <strong>${email}</strong></p>
        <p>Click the link in your email to sign in. The link will expire in 24 hours.</p>
        <div class="email-tips">
          <h4>Don't see the email?</h4>
          <ul>
            <li>Check your spam or junk folder</li>
            <li>Make sure you entered the correct email address</li>
            <li>Wait a few minutes for the email to arrive</li>
          </ul>
        </div>
        <button type="button" class="back-button" id="backButton">
          ← Send to a different email
        </button>
      </div>
    `;

    // Replace the form with instructions
    const loginCard = this.element.querySelector('.login-card');
    loginCard.replaceChild(instructions, this.element.querySelector('.login-form'));
    loginCard.replaceChild(document.createElement('div'), this.element.querySelector('.login-help'));

    // Handle back button
    instructions.querySelector('#backButton').addEventListener('click', () => {
      this._resetForm();
    });
  }

  _resetForm() {
    // Restore the original form HTML
    this.element.innerHTML = this._getHTML();
    this._attachEventListeners();
  }

  _setLoading(loading) {
    this.isLoading = loading;
    const button = this.element.querySelector('#loginButton');
    const buttonText = button.querySelector('.button-text');
    const buttonLoading = button.querySelector('.button-loading');
    const emailInput = this.element.querySelector('#email');

    if (loading) {
      button.disabled = true;
      buttonText.style.display = 'none';
      buttonLoading.style.display = 'flex';
      emailInput.disabled = true;
    } else {
      button.disabled = false;
      buttonText.style.display = 'inline';
      buttonLoading.style.display = 'none';
      emailInput.disabled = false;
    }
  }

  _showMessage(text, type = 'info') {
    const messageDiv = this.element.querySelector('#loginMessage');
    messageDiv.textContent = text;
    messageDiv.className = `login-message ${type}`;
    messageDiv.style.display = 'block';
  }

  _clearMessage() {
    const messageDiv = this.element.querySelector('#loginMessage');
    messageDiv.style.display = 'none';
    messageDiv.textContent = '';
    messageDiv.className = 'login-message';
  }

  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}