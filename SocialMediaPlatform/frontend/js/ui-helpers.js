// Shared visual helpers for FUSE — avatar generation + icon set.
// Included on feed.html and profile.html before feed.js / profile.js.

const AVATAR_PALETTE = ['#FFD9C0', '#C9E4FF', '#E3D9FF', '#FFD1E3', '#D3F3DF', '#FFE8B3'];

function avatarColor(username) {
  let sum = 0;
  for (let i = 0; i < username.length; i++) sum += username.charCodeAt(i);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

function initials(username) {
  return username.slice(0, 2).toUpperCase();
}

// size in px, defaults to the CSS-defined 42px avatar
function avatarHTML(username, size) {
  const style = size ? ` style="width:${size}px;height:${size}px;"` : '';
  return `
    <div class="avatar-ring"${style}>
      <div class="avatar" style="background:${avatarColor(username)};">${initials(username)}</div>
    </div>
  `;
}

const ICONS = {
  message: `<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  heartOutline: `<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.4 8.2 2 4.5 5.6 4c2-.3 3.9.7 5 2.3.9-1.6 2.9-2.6 4.9-2.3 3.6.5 5.2 4.2 3.6 7.7C19.5 16.4 12 21 12 21z" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
  heartFilled: `<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.4 8.2 2 4.5 5.6 4c2-.3 3.9.7 5 2.3.9-1.6 2.9-2.6 4.9-2.3 3.6.5 5.2 4.2 3.6 7.7C19.5 16.4 12 21 12 21z" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
  comment: `<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  home: `<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  profile: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6" stroke-linecap="round"/><path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  plus: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>`,
  logout: `<svg viewBox="0 0 24 24"><path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 17l5-5-5-5M21 12H9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  delete: `<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};