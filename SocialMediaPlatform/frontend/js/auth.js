// Redirect to feed if already logged in
if (getToken()) {
  window.location.href = 'feed.html';
}

const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authError = document.getElementById('authError');

// ---- Tab switching ----
loginTab.addEventListener('click', () => {
  loginTab.classList.add('active');
  registerTab.classList.remove('active');
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
  authError.classList.add('hidden');
});

registerTab.addEventListener('click', () => {
  registerTab.classList.add('active');
  loginTab.classList.remove('active');
  registerForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
  authError.classList.add('hidden');
});

// ---- Login ----
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.add('hidden');

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const data = await apiRequest('/auth/login', 'POST', { email, password });
    setToken(data.token);
    setCurrentUser(data.user);
    window.location.href = 'feed.html';
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.remove('hidden');
  }
});

// ---- Register ----
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.add('hidden');

  const username = document.getElementById('registerUsername').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  try {
    const data = await apiRequest('/auth/register', 'POST', { username, email, password });
    setToken(data.token);
    setCurrentUser(data.user);
    window.location.href = 'feed.html';
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.remove('hidden');
  }
});