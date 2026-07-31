requireAuth();

const currentUser = getCurrentUser();
document.getElementById('myProfileLink').href = `profile.html?username=${currentUser.username}`;

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearToken();
  window.location.href = 'index.html';
});

// ---- Icon + nav wiring ----
document.querySelector('.navbar .nav-links a[href="feed.html"]').innerHTML = ICONS.home;
document.getElementById('myProfileLink').innerHTML = ICONS.profile;
document.getElementById('logoutBtn').innerHTML = ICONS.logout;

const mobileProfileLink = document.getElementById('myProfileLinkMobile');
mobileProfileLink.href = `profile.html?username=${currentUser.username}`;
mobileProfileLink.innerHTML = ICONS.profile;
document.querySelector('.bottom-nav a[href="feed.html"]').innerHTML = ICONS.home;
document.getElementById('logoutBtnMobile').innerHTML = ICONS.logout;
document.getElementById('logoutBtnMobile').addEventListener('click', () => {
  clearToken();
  window.location.href = 'index.html';
});
document.getElementById('composeShortcut').innerHTML = ICONS.plus;
document.getElementById('composeShortcut').addEventListener('click', () => {
  window.location.href = 'feed.html#compose';
});
// ---- Unread messages badge ----
async function checkUnreadMessages() {
  try {
    const conversations = await apiRequest('/messages', 'GET', null, true);
    const hasUnread = conversations.some(c => c.unread);

    document.querySelectorAll('a[href="messages.html"]').forEach(link => {
      link.querySelector('.nav-badge')?.remove();
      if (hasUnread) {
        const badge = document.createElement('span');
        badge.className = 'nav-badge';
        link.appendChild(badge);
      }
    });
  } catch (err) {
    console.error('Could not check messages', err);
  }
}

checkUnreadMessages();
// Get username from URL: profile.html?username=someone
const params = new URLSearchParams(window.location.search);
const targetUsername = params.get('username');

let profileUser = null;

async function loadProfile() {
  try {
    profileUser = await apiRequest(`/users/${targetUsername}`, 'GET', null, true);

    document.getElementById('profileAvatar').innerHTML = avatarHTML(profileUser.username);
    document.getElementById('profileUsername').textContent = profileUser.username;
    document.getElementById('profileBio').textContent = profileUser.bio || 'No bio yet.';
    document.getElementById('followersCount').textContent = profileUser.followers.length;
    document.getElementById('followingCount').textContent = profileUser.following.length;

    document.getElementById('privateBadge').classList.toggle('hidden', !profileUser.isPrivate);

    const isOwnProfile = profileUser.isOwnProfile;
    const followBtn = document.getElementById('followBtn');
    const editBioBox = document.getElementById('editBioBox');
    const ownProfileControls = document.getElementById('ownProfileControls');

    if (isOwnProfile) {
      editBioBox.classList.remove('hidden');
      ownProfileControls.classList.remove('hidden');
      document.getElementById('bioInput').value = profileUser.bio || '';

      updatePrivacyToggleBtn(profileUser.isPrivate);
      loadRequestsInbox();
    } else {
      followBtn.classList.remove('hidden');
      document.getElementById('messageBtn').classList.remove('hidden');
      updateFollowBtn(profileUser.isFollowing, profileUser.requestPending);
    }

    loadProfilePosts();
  } catch (err) {
    document.getElementById('profileUsername').textContent = 'User not found';
  }
}

function updateFollowBtn(isFollowing, requestPending) {
  const followBtn = document.getElementById('followBtn');
  followBtn.classList.remove('following', 'requested');

  if (isFollowing) {
    followBtn.textContent = 'Following';
    followBtn.classList.add('following');
  } else if (requestPending) {
    followBtn.textContent = 'Requested';
    followBtn.classList.add('requested');
  } else {
    followBtn.textContent = 'Follow';
  }
}

function updatePrivacyToggleBtn(isPrivate) {
  const btn = document.getElementById('privacyToggleBtn');
  btn.textContent = isPrivate ? 'Make Public' : 'Make Private';
}

document.getElementById('followBtn').addEventListener('click', async () => {
  try {
    const data = await apiRequest(`/users/${profileUser._id}/follow`, 'POST', null, true);
    updateFollowBtn(data.following, data.requestPending);
    loadProfile(); // refresh counts
  } catch (err) {
    alert(err.message);
  }
});
document.getElementById('messageBtn').addEventListener('click', () => {
  window.location.href = `messages.html?with=${profileUser.username}`;
});

document.getElementById('saveBioBtn').addEventListener('click', async () => {
  const bio = document.getElementById('bioInput').value;
  try {
    await apiRequest('/users/me/update', 'PUT', { bio }, true);
    document.getElementById('profileBio').textContent = bio || 'No bio yet.';
    alert('Bio updated!');
  } catch (err) {
    alert(err.message);
  }
});

async function loadProfilePosts() {
  const postsList = document.getElementById('profilePosts');
  postsList.innerHTML = '<p>Loading...</p>';

  try {
    const posts = await apiRequest(`/posts/user/${profileUser._id}`, 'GET', null, true);
    document.getElementById('postsCount').textContent = posts.length;

    if (posts.length === 0) {
      postsList.innerHTML = '<p style="text-align:center;color:#999;grid-column:1/-1;">No posts yet.</p>';
      return;
    }

    postsList.innerHTML = posts.map(post => `
      <div class="post" data-id="${post._id}">
        <div class="post-header">
          ${avatarHTML(post.user.username)}
          <div class="meta">
            <span class="username">${post.user.username}</span>
            <span class="timestamp">${new Date(post.createdAt).toLocaleString()}</span>
          </div>
          ${profileUser.isOwnProfile ? `<button class="delete-post-btn" data-id="${post._id}" title="Delete post">✕</button>` : ''}
        </div>
        <div class="post-content">${post.content}</div>
        <div class="post-actions">
          <span>${ICONS.heartFilled} ${post.likes.length}</span>
          <span>${ICONS.comment} ${post.comments.length}</span>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.delete-post-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this post? This cannot be undone.')) return;

        try {
          await apiRequest(`/posts/${btn.dataset.id}`, 'DELETE', null, true);
          loadProfilePosts();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    if (err.message === 'This account is private') {
      document.getElementById('postsCount').textContent = '—';
      postsList.innerHTML = `
        <div style="text-align:center;color:#999;grid-column:1/-1;padding:30px 0;">
          🔒 This account is private.<br>Follow to see their posts.
        </div>
      `;
    } else {
      postsList.innerHTML = `<p style="color:red;">${err.message}</p>`;
    }
  }
}

document.getElementById('privacyToggleBtn').addEventListener('click', async () => {
  try {
    const data = await apiRequest('/users/me/privacy', 'PUT', null, true);
    updatePrivacyToggleBtn(data.isPrivate);
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('requestsInboxBtn').addEventListener('click', () => {
  const panel = document.getElementById('requestsPanel');
  panel.classList.toggle('hidden');
});

async function loadRequestsInbox() {
  try {
    const requests = await apiRequest('/users/me/requests', 'GET', null, true);
    const inboxBtn = document.getElementById('requestsInboxBtn');
    const panel = document.getElementById('requestsPanel');

    if (requests.length === 0) {
      inboxBtn.classList.add('hidden');
      panel.classList.add('hidden');
      panel.innerHTML = '';
      return;
    }

    inboxBtn.classList.remove('hidden');
    inboxBtn.textContent = `Requests (${requests.length})`;

    panel.innerHTML = requests.map(u => `
      <div class="request-item" data-id="${u._id}">
        ${avatarHTML(u.username)}
        <span class="request-username">${u.username}</span>
        <div class="request-actions">
          <button class="accept-btn" data-id="${u._id}">Accept</button>
          <button class="reject-btn" data-id="${u._id}">Reject</button>
        </div>
      </div>
    `).join('');

    panel.querySelectorAll('.accept-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await apiRequest(`/users/requests/${btn.dataset.id}/accept`, 'POST', null, true);
          loadRequestsInbox();
          loadProfile();
        } catch (err) {
          alert(err.message);
        }
      });
    });

    panel.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await apiRequest(`/users/requests/${btn.dataset.id}/reject`, 'POST', null, true);
          loadRequestsInbox();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    console.error(err);
  }
}

loadProfile();