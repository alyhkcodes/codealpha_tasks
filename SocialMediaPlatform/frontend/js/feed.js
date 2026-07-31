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
  document.getElementById('composeBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('postContent').focus();
});
// ---- Live username search ----
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
let searchDebounce = null;

searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  const q = searchInput.value.trim();

  if (!q) {
    searchResults.classList.add('hidden');
    searchResults.innerHTML = '';
    return;
  }

  searchDebounce = setTimeout(() => runSearch(q), 300);
});

async function runSearch(q) {
  try {
    const users = await apiRequest(`/users/search?q=${encodeURIComponent(q)}`, 'GET', null, true);

    if (users.length === 0) {
      searchResults.innerHTML = '<div class="search-empty">No users found</div>';
    } else {
      searchResults.innerHTML = users.map(u => `
        <div class="search-result-item" data-username="${u.username}">
          ${avatarHTML(u.username)}
          <span class="search-result-username">${u.username}</span>
        </div>
      `).join('');

      searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          window.location.href = `profile.html?username=${item.dataset.username}`;
        });
      });
    }

    searchResults.classList.remove('hidden');
  } catch (err) {
    searchResults.innerHTML = `<div class="search-empty">${err.message}</div>`;
    searchResults.classList.remove('hidden');
  }
}

// Close dropdown when clicking elsewhere
document.addEventListener('click', (e) => {
  if (!e.target.closest('.navbar-search')) {
    searchResults.classList.add('hidden');
  }
});
const globalTab = document.getElementById('globalTab');
const followingTab = document.getElementById('followingTab');
const postsList = document.getElementById('postsList');
const postContent = document.getElementById('postContent');
const postBtn = document.getElementById('postBtn');
const storiesRow = document.getElementById('storiesRow');

let currentFeed = 'global';

// ---- Tab switching ----
globalTab.addEventListener('click', () => {
  currentFeed = 'global';
  globalTab.classList.add('active');
  followingTab.classList.remove('active');
  loadFeed();
});

followingTab.addEventListener('click', () => {
  currentFeed = 'following';
  followingTab.classList.add('active');
  globalTab.classList.remove('active');
  loadFeed();
});

// ---- Create post ----
postBtn.addEventListener('click', async () => {
  const content = postContent.value.trim();
  if (!content) return;

  try {
    await apiRequest('/posts', 'POST', { content }, true);
    postContent.value = '';
    loadFeed();
  } catch (err) {
    alert(err.message);
  }
});

// ---- Load feed ----
async function loadFeed() {
  postsList.innerHTML = '<p style="text-align:center;color:#999;padding:20px 0;">Loading...</p>';

  try {
    const endpoint = currentFeed === 'global' ? '/posts' : '/posts/following';
    const posts = await apiRequest(endpoint, 'GET', null, true);

    if (posts.length === 0) {
      postsList.innerHTML = '<p style="text-align:center;color:#999;padding:20px 0;">No posts yet.</p>';
      return;
    }

    postsList.innerHTML = posts.map(renderPost).join('');
    attachPostListeners();
  } catch (err) {
    postsList.innerHTML = `<p style="color:red;">${err.message}</p>`;
  }
}

// ---- Stories ----
let storyGroups = [];
let viewerGroupIndex = 0;
let viewerStoryIndex = 0;
let viewerTimer = null;
const STORY_DURATION = 5000;

async function loadStories() {
  try {
    storyGroups = await apiRequest('/stories', 'GET', null, true);
    renderStoriesRow();
  } catch (err) {
    storiesRow.innerHTML = '';
  }
}

function renderStoriesRow() {
  const addBubble = `
    <button class="story add-story" id="addStoryBtn">
      <div class="avatar-ring plain">
        <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </div>
      <span class="story-name">Add Story</span>
    </button>
  `;

  const groupBubbles = storyGroups.map((group, i) => `
    <button class="story" data-group-index="${i}">
      <div class="avatar-ring">
        <div class="avatar" style="background:${avatarColor(group.author.username)};">${initials(group.author.username)}</div>
      </div>
      <span class="story-name">${group.author.username === currentUser.username ? 'You' : group.author.username}</span>
    </button>
  `).join('');

  storiesRow.innerHTML = addBubble + groupBubbles;

  document.getElementById('addStoryBtn').addEventListener('click', openStoryComposer);

  storiesRow.querySelectorAll('.story:not(.add-story)').forEach(btn => {
    btn.addEventListener('click', () => openStoryViewer(parseInt(btn.dataset.groupIndex, 10)));
  });
}

// ---- Story composer ----
const storyComposerModal = document.getElementById('storyComposerModal');
const storyText = document.getElementById('storyText');
const storyImageInput = document.getElementById('storyImageInput');
const storyImagePreview = document.getElementById('storyImagePreview');
const storyPostBtn = document.getElementById('storyPostBtn');
let storyImageData = null;

function openStoryComposer() {
  storyText.value = '';
  storyImageInput.value = '';
  storyImagePreview.classList.add('hidden');
  storyImageData = null;
  storyComposerModal.classList.remove('hidden');
}

function closeStoryComposer() {
  storyComposerModal.classList.add('hidden');
}

document.getElementById('storyComposerClose').addEventListener('click', closeStoryComposer);
document.getElementById('storyComposerBackdrop').addEventListener('click', closeStoryComposer);

storyImageInput.addEventListener('change', () => {
  const file = storyImageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    storyImageData = reader.result;
    storyImagePreview.src = storyImageData;
    storyImagePreview.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});

storyPostBtn.addEventListener('click', async () => {
  const text = storyText.value.trim();
  if (!text && !storyImageData) {
    alert('Add some text or an image first.');
    return;
  }

  try {
    await apiRequest('/stories', 'POST', { text, image: storyImageData }, true);
    closeStoryComposer();
    loadStories();
  } catch (err) {
    alert(err.message);
  }
});

// ---- Story viewer ----
const storyViewerModal = document.getElementById('storyViewerModal');
const storyViewerProgress = document.getElementById('storyViewerProgress');
const storyViewerHeader = document.getElementById('storyViewerHeader');
const storyViewerBody = document.getElementById('storyViewerBody');
const storyDeleteBtn = document.getElementById('storyDeleteBtn');

function openStoryViewer(groupIndex) {
  viewerGroupIndex = groupIndex;
  viewerStoryIndex = 0;
  storyViewerModal.classList.remove('hidden');
  renderCurrentStory();
}

function closeStoryViewer() {
  clearTimeout(viewerTimer);
  storyViewerModal.classList.add('hidden');
}

function renderCurrentStory() {
  clearTimeout(viewerTimer);

  const group = storyGroups[viewerGroupIndex];
  if (!group) return closeStoryViewer();

  const story = group.stories[viewerStoryIndex];
  if (!story) return closeStoryViewer();

  storyViewerProgress.innerHTML = group.stories.map((_, i) => `
    <div class="segment ${i < viewerStoryIndex ? 'done' : ''}">
      <div class="fill" style="${i === viewerStoryIndex ? 'width:0%;transition:width ' + STORY_DURATION + 'ms linear;' : ''}"></div>
    </div>
  `).join('');

  storyViewerHeader.innerHTML = `
    ${avatarHTML(group.author.username)}
    <span>${group.author.username === currentUser.username ? 'You' : group.author.username}</span>
  `;

  storyViewerBody.innerHTML = story.image
    ? `<img src="${story.image}">`
    : `<div>${escapeHtml(story.text)}</div>`;

  const isOwn = group.author.username === currentUser.username;
  storyDeleteBtn.classList.toggle('hidden', !isOwn);
  storyDeleteBtn.innerHTML = 'Delete';
  storyDeleteBtn.dataset.storyId = story._id;

  // trigger the fill animation on next frame
  requestAnimationFrame(() => {
    const activeFill = storyViewerProgress.querySelector('.segment:not(.done) .fill');
    if (activeFill) requestAnimationFrame(() => { activeFill.style.width = '100%'; });
  });

  viewerTimer = setTimeout(advanceStory, STORY_DURATION);
}

function advanceStory() {
  const group = storyGroups[viewerGroupIndex];
  if (viewerStoryIndex < group.stories.length - 1) {
    viewerStoryIndex++;
  } else if (viewerGroupIndex < storyGroups.length - 1) {
    viewerGroupIndex++;
    viewerStoryIndex = 0;
  } else {
    return closeStoryViewer();
  }
  renderCurrentStory();
}

function rewindStory() {
  if (viewerStoryIndex > 0) {
    viewerStoryIndex--;
  } else if (viewerGroupIndex > 0) {
    viewerGroupIndex--;
    viewerStoryIndex = storyGroups[viewerGroupIndex].stories.length - 1;
  } else {
    return;
  }
  renderCurrentStory();
}

document.getElementById('storyViewerClose').addEventListener('click', closeStoryViewer);
document.getElementById('storyViewerBackdrop').addEventListener('click', closeStoryViewer);

storyViewerBody.addEventListener('click', (e) => {
  const rect = storyViewerBody.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  if (clickX < rect.width * 0.3) {
    rewindStory();
  } else {
    advanceStory();
  }
});

storyDeleteBtn.addEventListener('click', async () => {
  if (!confirm('Delete this story?')) return;

  try {
    await apiRequest(`/stories/${storyDeleteBtn.dataset.storyId}`, 'DELETE', null, true);

    const group = storyGroups[viewerGroupIndex];
    group.stories.splice(viewerStoryIndex, 1);

    if (group.stories.length === 0) {
      storyGroups.splice(viewerGroupIndex, 1);
      renderStoriesRow();
      if (storyGroups.length === 0) return closeStoryViewer();
      if (viewerGroupIndex >= storyGroups.length) viewerGroupIndex = storyGroups.length - 1;
      viewerStoryIndex = 0;
    } else if (viewerStoryIndex >= group.stories.length) {
      viewerStoryIndex = group.stories.length - 1;
    }

    renderCurrentStory();
  } catch (err) {
    alert(err.message);
  }
});
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
loadStories();

// ---- Render a single post ----
function renderPost(post) {
  const liked = post.likes.includes(currentUser.id);
  const timeAgo = new Date(post.createdAt).toLocaleString();

  const commentsHtml = post.comments.map(c => `
    <div class="comment">
      <span class="comment-user">${c.user.username}</span>${c.text}
    </div>
  `).join('');

  const isOwnPost = post.user._id === currentUser.id || post.user.username === currentUser.username;

  return `
    <div class="post" data-id="${post._id}">
      <div class="post-header">
        ${avatarHTML(post.user.username)}
        <div class="meta">
          <span class="username" onclick="location.href='profile.html?username=${post.user.username}'">${post.user.username}</span>
          <span class="timestamp">${timeAgo}</span>
        </div>
        ${isOwnPost ? `<button class="delete-post-btn" data-id="${post._id}" title="Delete post">✕</button>` : ''}
      </div>
      <div class="post-content">${post.content}</div>
      <div class="post-actions">
        <button class="like-btn ${liked ? 'liked' : ''}" data-id="${post._id}">
          ${liked ? ICONS.heartFilled : ICONS.heartOutline} ${post.likes.length}
        </button>
        <button class="comment-toggle-btn" data-id="${post._id}">
          ${ICONS.comment} ${post.comments.length}
        </button>
      </div>
      <div class="comments-section hidden" id="comments-${post._id}">
        ${commentsHtml}
        <form class="comment-form" data-id="${post._id}">
          <input type="text" placeholder="Write a comment..." required>
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  `;
}

// ---- Attach listeners after render ----
function attachPostListeners() {
  document.querySelectorAll('.delete-post-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this post? This cannot be undone.')) return;

      try {
        await apiRequest(`/posts/${btn.dataset.id}`, 'DELETE', null, true);
        loadFeed();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;

      btn.classList.add('pop');
      setTimeout(() => btn.classList.remove('pop'), 400);

      try {
        await apiRequest(`/posts/${id}/like`, 'POST', null, true);
        loadFeed();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  document.querySelectorAll('.comment-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      document.getElementById(`comments-${id}`).classList.toggle('hidden');
    });
  });

  document.querySelectorAll('.comment-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.dataset.id;
      const input = form.querySelector('input');
      const text = input.value.trim();
      if (!text) return;

      try {
        await apiRequest(`/posts/${id}/comment`, 'POST', { text }, true);
        loadFeed();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

loadFeed();

// If we arrived via a "new post" shortcut from another page, jump to the composer.
if (window.location.hash === '#compose') {
  document.getElementById('composeBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('postContent').focus();
}