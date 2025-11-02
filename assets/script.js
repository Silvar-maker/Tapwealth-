// script.js — TapWealth Core Utilities
// Handles affiliate linking, cashback simulation, user data, and more

// === Affiliate Configuration ===
// 🔑 REPLACE THESE WITH YOUR REAL AFFILIATE IDs ONCE YOU JOIN
const TAPWEALTH_AFFILIATES = {
  temu: 'YOUR_TEMU_AFFILIATE_ID',        // e.g. 'tapwealth123'
  jumia: 'YOUR_JUMIA_AFFILIATE_ID',      // e.g. '1234567890'
  aliexpress: 'YOUR_ALIEXPRESS_ID'       // e.g. '3256789'
};

// Optional: AliExpress short key (if provided by affiliate network)
const ALIEXPRESS_SHORT_KEY = ''; // leave empty if not used

// === Utility: Get current user ===
function getCurrentUser() {
  const saved = localStorage.getItem('tapwealth_current_user');
  return saved ? JSON.parse(saved) : null;
}

// === Utility: Save user data ===
function saveCurrentUser(user) {
  localStorage.setItem('tapwealth_current_user', JSON.stringify(user));
  const users = JSON.parse(localStorage.getItem('tapwealth_users') || '[]');
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) {
    users[idx] = user;
    localStorage.setItem('tapwealth_users', JSON.stringify(users));
  }
}

// === Affiliate Link Generator ===
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

// === Track Store Click ===
function trackStoreClick(store) {
  const user = getCurrentUser();
  if (!user) return;

  const now = Date.now();
  const pending = JSON.parse(localStorage.getItem('tapwealth_pending_cashback') || '[]');

  // Simulate expected cashback amounts (adjust as needed)
  const estimates = { jumia: '₦500', temu: '₦850', aliexpress: '₦720' };
  const amount = estimates[store] || '₦300';

  pending.push({
    id: now,
    store,
    amount,
    status: 'Processing',
    clickedAt: now,
    expiresAt: now + 48 * 60 * 60 * 1000 // 48 hours
  });

  localStorage.setItem('tapwealth_pending_cashback', JSON.stringify(pending));
}

// === Open Store with Tracking ===
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

// === Get Pending Cashback ===
function getPendingCashback() {
  const pending = JSON.parse(localStorage.getItem('tapwealth_pending_cashback') || '[]');
  const now = Date.now();
  
  // Remove expired items
  const valid = pending.filter(item => item.expiresAt > now);
  if (valid.length !== pending.length) {
    localStorage.setItem('tapwealth_pending_cashback', JSON.stringify(valid));
  }
  return valid;
}

// === Logout ===
function logoutUser() {
  localStorage.removeItem('tapwealth_current_user');
  alert('You have been logged out!');
  window.location.href = 'login.html';
}

// === Session Timeout ===
let sessionTimeout = null;
function startSessionTimeout() {
  if (sessionTimeout) clearTimeout(sessionTimeout);
  sessionTimeout = setTimeout(logoutUser, 5 * 60 * 1000); // 5 minutes

  ['mousemove', 'keypress', 'click', 'scroll'].forEach(event =>
    document.addEventListener(event, () => startSessionTimeout(), { passive: true })
  );
}

// === Update Mobile User Info ===
function updateMobileUserInfo() {
  const user = getCurrentUser();
  if (!user) return;
  document.getElementById('mobile-user-avatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('mobile-user-name').textContent = user.name;
  document.getElementById('mobile-user-balance').textContent = user.balance.toLocaleString();
}
