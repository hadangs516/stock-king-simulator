import { API_URL } from './config.js';
const key = 'stock-king-session';
const safeRead = storage => { try { return storage.getItem(key); } catch { return null; } };
export const api = {
  token: safeRead(sessionStorage) || safeRead(localStorage), adminToken: '', proxyToken: '',
  save(token, remember) {
    this.clear(); this.token = token;
    try { (remember ? localStorage : sessionStorage).setItem(key, token); } catch { /* Current tab remains signed in. */ }
  },
  clear() {
    this.token = ''; this.adminToken = ''; this.proxyToken = '';
    try { sessionStorage.removeItem(key); localStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
  },
  async send(action, data = {}) {
    if (!navigator.onLine) throw new Error('인터넷 연결이 끊겼습니다. 연결 후 다시 시도해 주세요.');
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch(API_URL, {
        method: 'POST', redirect: 'follow', cache: 'no-store', credentials: 'omit',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ version: 1, token: this.token, adminToken: this.adminToken, proxyToken: this.proxyToken, action, ...data }),
        signal: controller.signal
      });
      let result;
      try { result = await response.json(); } catch { throw new Error('게임 서버 응답을 확인할 수 없습니다. 운영자가 Apps Script 설치와 배포를 완료해야 합니다.'); }
      if (result.error) { const error = new Error(result.message || '요청을 처리하지 못했습니다.'); error.code = result.error; error.definitive = result.error === 'REQUEST_FAILED' || result.error === 'MARKET_CATCHUP'; throw error; }
      if (result.service !== 'stock-king' || result.version !== 1) throw new Error('연결된 주소가 주식왕 게임 서버가 아닙니다. 운영자가 서버 코드를 배포해야 합니다.');
      return result;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('응답 시간이 초과됐습니다. 처리 여부를 확인하려면 같은 요청으로 재시도해 주세요.');
      if (error instanceof TypeError) throw new Error('서버에 연결하지 못했습니다. 인터넷과 Apps Script 배포 권한을 확인해 주세요.');
      throw error;
    } finally { clearTimeout(timeout); }
  },
  async status() {
    const response = await fetch(API_URL, { redirect: 'follow', cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(20000) });
    const result = await response.json();
    if (result.service !== 'stock-king' || result.version !== 1 || result.error) throw new Error('게임 서버 설치를 기다리고 있습니다.');
    return result;
  }
};
