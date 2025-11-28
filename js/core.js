// js/core.js — REAL shared state (works offline, no server)
class TapwealthCore {
  static init() {
    // Load or init user data
    if (!localStorage.getItem('tapwealth_user')) {
      this.resetUser();
    }
  }

  static resetUser() {
    const userId = 'user_' + Math.random().toString(36).substr(2, 9);
    const ref = new URLSearchParams(window.location.search).get('ref') || 'direct';
    localStorage.setItem('tapwealth_user', JSON.stringify({
      id: userId,
      referrer: ref,
      taps: 0,
      earned: 0,
      referrals: 0,
      lastActive: Date.now()
    }));
  }

  static getUser() {
    return JSON.parse(localStorage.getItem('tapwealth_user') || '{}');
  }

  static updateUser(data) {
    const user = this.getUser();
    Object.assign(user, data, { lastActive: Date.now() });
    localStorage.setItem('tapwealth_user', JSON.stringify(user));
  }

  static addTaps(n = 1) {
    const user = this.getUser();
    user.taps += n;
    // Auto-reward logic
    if (user.taps === 50) { window.open('https://temu.com?_ref=wealthysilvar&campaign=tap50', '_blank'); }
    if (user.taps === 100) { window.open('https://www.jumia.com.ng/?aff=1132345&c=wealthysilvar', '_blank'); }
    this.updateUser({ taps: user.taps });
  }

  static isAuthenticated() {
    return !!localStorage.getItem('tapwealth_user');
  }

  static logout() {
    localStorage.removeItem('tapwealth_user');
    window.location.href = 'index.html';
  }
}

// Auto-init on load
document.addEventListener('DOMContentLoaded', () => TapwealthCore.init());
