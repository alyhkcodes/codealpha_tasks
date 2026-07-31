const API_URL = 'https://fuse-backend.vercel.app/api';

// ---- Token helpers ----
function getToken() {
  return localStorage.getItem('fuse_token');
}

function setToken(token) {
  localStorage.setItem('fuse_token', token);
}

function clearToken() {
  localStorage.removeItem('fuse_token');
  localStorage.removeItem('fuse_user');
}

function getCurrentUser() {
  const user = localStorage.getItem('fuse_user');
  return user ? JSON.parse(user) : null;
}

function setCurrentUser(user) {
  localStorage.setItem('fuse_user', JSON.stringify(user));
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = 'index.html';
  }
}

// ---- Core fetch wrapper ----
async function apiRequest(endpoint, method = 'GET', body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${endpoint}`, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}