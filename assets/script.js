// script.js — TapWealth Core Utilities

const TAPWEALTH_AFFILIATES = {
  temu: 'YOUR_TEMU_AFFILIATE_ID',
  jumia: 'YOUR_JUMIA_AFFILIATE_ID',
  aliexpress: '3256789'   // ← REPLACE WITH YOUR REAL AFFILIATE ID (number)
};

const ALIEXPRESS_SHORT_KEY = ''; // leave empty if not provided

function getCurrentUser() {
  const saved = localStorage.getItem('tapwealth_current_user');
  return saved ? JSON.parse(saved) : null;
}

function saveCurrentUser(user) {
  localStorage.setItem('tapwealth_current_user', JSON.stringify(user));
  const users = JSON.parse(localStorage.getItem('tapwealth_users') || '[]');
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) {
    users[idx] = user;
    localStorage.setItem('tapwealth_users', JSON.stringify(users));
  }
}

function generateAffiliateLink(store, userId) {
  const baseUrls = {
    jumia: `https://www.jumia.com.ng/?utm_source=affiliation&utm_medium=TapWealth&utm_campaign=${userId}`,
    temu: `https://www.temu.com/share.html?aff=${TAPWEALTH_AFFILIATES.temu}&ref=${userId}`,
    aliexpress: ALIEXPRESS_SHORT_KEY
      ? `https://www.aliexpress.com/aff/${TAPWEALTH_AFFILIATES.aliexpress}?trafficSource=1&aff_short_key=${ALIEXPRESS_SHORT_KEY}&dp=${userId}`
      : `https://www.aliexpress.com/aff/${TAPWEALTH_AFFILIATES.aliexpress}?dp=${userId}`
  };
  return baseUrls[store] || `https://www.${store}.com`;
}

function trackStoreClick(store) {
  const user = getCurrentUser();
  if (!user) return;

  const now = Date.now();
  const pending = JSON.parse(localStorage.getItem('tapwealth_pending_cashback') || '[]');

  const estimates = { jumia: '₦500', temu: '₦850', aliexpress: '₦720' };
  const amount = estimates[store] || '₦300';

  pending.push({
    id: now,
    store,
    amount,
    status: 'Processing',
    clickedAt: now,
    expiresAt: now + 48 * 60 * 60 * 1000
  });

  localStorage.setItem('tapwealth_pending_cashback', JSON.stringify(pending));
}

function shopThrough(store) {
  const user = getCurrentUser();
  if (!user) {
    alert('Please log in to earn cashback!');
    return;
  }

  trackStoreClick(store);
  const link = generateAffiliateLink(store, user.id || 'guest');
  window.open(link, '_blank');

  const storeNames = { jumia: 'Jumia', temu: 'Temu', aliexpress: 'AliExpress' };
  alert(`✅ Opening ${storeNames[store]}!\nYour cashback will appear in your wallet within 24–48 hours.`);
}

function getPendingCashback() {
  const pending = JSON.parse(localStorage.getItem('tapwealth_pending_cashback') || '[]');
  const now = Date.now();
  const valid = pending.filter(item => item.expiresAt > now);
  if (valid.length !== pending.length) {
    localStorage.setItem('tapwealth_pending_cashback', JSON.stringify(valid));
  }
  return valid;
}

function logoutUser() {
  localStorage.removeItem('tapwealth_current_user');
  alert('You have been logged out!');
  window.location.href = 'login.html';
}

let sessionTimeout = null;
function startSessionTimeout() {
  if (sessionTimeout) clearTimeout(sessionTimeout);
  sessionTimeout = setTimeout(logoutUser, 3600000); // 1 hour (safe for testing)
}

function updateMobileUserInfo() {
  const user = getCurrentUser();
  if (!user) return;
  document.getElementById('mobile-user-avatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('mobile-user-name').textContent = user.name;
  document.getElementById('mobile-user-balance').textContent = user.balance.toLocaleString();
}
