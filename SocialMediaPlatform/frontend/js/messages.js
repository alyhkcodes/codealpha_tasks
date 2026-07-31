requireAuth();

const currentUser = getCurrentUser();
document.getElementById('myProfileLink').href = `profile.html?username=${currentUser.username}`;

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearToken();
  window.location.href = 'index.html';
});

// ---- Icon + nav wiring ----
document.querySelector('.navbar .nav-links a[href="feed.html"]').innerHTML = ICONS.home;
document.getElementById('messagesLink').innerHTML = ICONS.message;
document.getElementById('myProfileLink').innerHTML = ICONS.profile;
document.getElementById('logoutBtn').innerHTML = ICONS.logout;

const mobileProfileLink = document.getElementById('myProfileLinkMobile');
mobileProfileLink.href = `profile.html?username=${currentUser.username}`;
mobileProfileLink.innerHTML = ICONS.profile;
document.querySelector('.bottom-nav a[href="feed.html"]').innerHTML = ICONS.home;
document.getElementById('messagesLinkMobile').innerHTML = ICONS.message;
document.getElementById('logoutBtnMobile').innerHTML = ICONS.logout;
document.getElementById('logoutBtnMobile').addEventListener('click', () => {
  clearToken();
  window.location.href = 'index.html';
});
document.getElementById('composeShortcut').innerHTML = ICONS.plus;
document.getElementById('composeShortcut').addEventListener('click', () => {
  window.location.href = 'feed.html#compose';
});

// ---- View elements ----
const inboxView = document.getElementById('inboxView');
const conversationView = document.getElementById('conversationView');
const conversationsList = document.getElementById('conversationsList');
const messagesList = document.getElementById('messagesList');
const conversationPartnerEl = document.getElementById('conversationPartner');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');

let currentPartnerUsername = null;
let pollTimer = null;

// ---- Inbox ----
async function loadInbox() {
  conversationsList.innerHTML = '<p style="text-align:center;color:#999;padding:20px 0;">Loading...</p>';

  try {
    const conversations = await apiRequest('/messages', 'GET', null, true);

    if (conversations.length === 0) {
      conversationsList.innerHTML = '<div class="messages-empty">No conversations yet. Visit a profile and hit Message to start one.</div>';
      return;
    }

    conversationsList.innerHTML = conversations.map(c => `
      <div class="conversation-row ${c.unread ? 'unread' : ''}" data-username="${c.partner.username}">
        ${avatarHTML(c.partner.username)}
        <div class="conversation-info">
          <div class="conversation-username">
            ${c.partner.username}
            ${c.unread ? '<span class="unread-dot"></span>' : ''}
          </div>
          <div class="conversation-preview">${escapeHtml(c.lastMessage)}</div>
        </div>
        <div class="conversation-time">${formatTime(c.lastAt)}</div>
        <button class="delete-conversation-row-btn" data-username="${c.partner.username}" title="Delete conversation">${ICONS.delete}</button>
      </div>
    `).join('');

    conversationsList.querySelectorAll('.conversation-row').forEach(row => {
      row.addEventListener('click', () => openConversation(row.dataset.username));
    });

    conversationsList.querySelectorAll('.delete-conversation-row-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // don't trigger the row's own click (which opens the conversation)
        const username = btn.dataset.username;

        if (!confirm(`Delete your entire conversation with ${username}? This cannot be undone and removes it for both of you.`)) return;

        try {
          await apiRequest(`/messages/conversation/${username}`, 'DELETE', null, true);
          loadInbox();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    conversationsList.innerHTML = `<p style="color:red;">${err.message}</p>`;
  }
}

// ---- Conversation ----
async function openConversation(username) {
  currentPartnerUsername = username;
  inboxView.classList.add('hidden');
  conversationView.classList.remove('hidden');

  // Reflect the open conversation in the URL without a full reload
  const url = new URL(window.location);
  url.searchParams.set('with', username);
  window.history.replaceState({}, '', url);

  await loadConversation();
  stopPolling();
  pollTimer = setInterval(loadConversation, 4000);
}

async function loadConversation() {
  try {
    const data = await apiRequest(`/messages/${currentPartnerUsername}`, 'GET', null, true);

    conversationPartnerEl.innerHTML = `
      ${avatarHTML(data.partner.username)}
      <span>${data.partner.username}</span>
      <button id="deleteConversationBtn" title="Delete conversation">${ICONS.delete}</button>
    `;

    document.getElementById('deleteConversationBtn').addEventListener('click', async () => {
      if (!confirm(`Delete your entire conversation with ${data.partner.username}? This cannot be undone and removes it for both of you.`)) return;

      try {
        await apiRequest(`/messages/conversation/${data.partner.username}`, 'DELETE', null, true);
        closeConversation();
      } catch (err) {
        alert(err.message);
      }
    });

    const wasAtBottom = messagesList.scrollTop + messagesList.clientHeight >= messagesList.scrollHeight - 40;

    if (data.messages.length === 0) {
      messagesList.innerHTML = '<div class="messages-empty">No messages yet. Say hi!</div>';
    } else {
      messagesList.innerHTML = data.messages.map(m => {
        const sent = m.sender._id === currentUser.id;
        return `
          <div class="message-bubble ${sent ? 'sent' : 'received'}">
            ${escapeHtml(m.text)}
            <span class="message-time">${formatTime(m.createdAt)}</span>
          </div>
        `;
      }).join('');
    }

    if (wasAtBottom) {
      messagesList.scrollTop = messagesList.scrollHeight;
    }
  } catch (err) {
    messagesList.innerHTML = `<p style="color:red;">${err.message}</p>`;
  }
}

function closeConversation() {
  stopPolling();
  currentPartnerUsername = null;
  conversationView.classList.add('hidden');
  inboxView.classList.remove('hidden');

  const url = new URL(window.location);
  url.searchParams.delete('with');
  window.history.replaceState({}, '', url);

  loadInbox();
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

document.getElementById('backToInboxBtn').addEventListener('click', closeConversation);

messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !currentPartnerUsername) return;

  messageInput.value = '';

  try {
    await apiRequest('/messages', 'POST', { username: currentPartnerUsername, text }, true);
    await loadConversation();
    messagesList.scrollTop = messagesList.scrollHeight;
  } catch (err) {
    alert(err.message);
  }
});

// ---- Helpers ----
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  return isToday
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Stop polling if the user navigates away
window.addEventListener('beforeunload', stopPolling);

// ---- Init ----
const params = new URLSearchParams(window.location.search);
const deepLinkUsername = params.get('with');

if (deepLinkUsername) {
  openConversation(deepLinkUsername);
} else {
  loadInbox();
}