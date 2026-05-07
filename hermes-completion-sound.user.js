// ==UserScript==
// @name         Hermes WebUI 任务完成音效
// @namespace    hermes-completion-sound
// @version      1.0
// @description  AI 回复完成时播放提示音效
// @author       Hermes Agent
// @match        http://127.0.0.1:8648/*
// @match        http://localhost:8648/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ============ 配置 ============
  const CONFIG = {
    // 音效类型: 'chime' | 'ding' | 'bell' | 'success' | 'pop'
    sound: 'chime',
    // 音量 0.0 ~ 1.0
    volume: 0.5,
    // 仅在页面不活跃（后台/最小化）时播放
    onlyWhenHidden: false,
    // 页面标题闪烁提醒
    flashTitle: true,
    // 浏览器通知（需要用户授权）
    browserNotification: false,
  };
  // ==============================

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function getCtx() {
    if (!audioCtx) audioCtx = new AudioCtx();
    return audioCtx;
  }

  // 合成音效 —— 不依赖外部音频文件
  function playChime() {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // 三音上升和弦：C5 → E5 → G5
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(CONFIG.volume * 0.3, now + i * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.45);
    });
  }

  function playDing() {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(CONFIG.volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
  }

  function playBell() {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [660, 880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(CONFIG.volume * 0.2, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.8);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.85);
    });
  }

  function playSuccess() {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const notes = [392, 523.25, 659.25, 783.99]; // G4 C5 E5 G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(CONFIG.volume * 0.25, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.4);
    });
  }

  function playPop() {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    gain.gain.setValueAtTime(CONFIG.volume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  const SOUNDS = { chime: playChime, ding: playDing, bell: playBell, success: playSuccess, pop: playPop };

  function playSound() {
    try {
      (SOUNDS[CONFIG.sound] || SOUNDS.chime)();
    } catch (e) {
      console.warn('[Hermes Sound] 播放失败:', e);
    }
  }

  // 页面标题闪烁
  let titleTimer = null;
  const originalTitle = document.title;
  function flashTitle() {
    if (!CONFIG.flashTitle) return;
    if (titleTimer) return;
    let count = 0;
    titleTimer = setInterval(() => {
      document.title = count % 2 === 0 ? '✅ 任务完成！' : originalTitle;
      count++;
      if (count >= 6) {
        clearInterval(titleTimer);
        titleTimer = null;
        document.title = originalTitle;
      }
    }, 500);
  }

  // 浏览器通知
  function sendNotification() {
    if (!CONFIG.browserNotification) return;
    if (Notification.permission === 'granted') {
      new Notification('Hermes', { body: 'AI 任务已完成 ✅', icon: '/favicon.ico' });
    }
  }

  function shouldNotify() {
    if (CONFIG.onlyWhenHidden) return document.hidden;
    return true;
  }

  function onTaskComplete() {
    if (!shouldNotify()) return;
    console.log('[Hermes Sound] 🎵 任务完成，播放音效');
    playSound();
    flashTitle();
    sendNotification();
  }

  // ============ 事件拦截 ============

  // 方法1: 拦截 Socket.IO 的 run.completed 事件
  function hookSocketIO() {
    // 轮询查找 io 实例
    const check = setInterval(() => {
      // 拦截原生 WebSocket message 事件来捕获 Socket.IO 帧
      const origWS = window.WebSocket;
      if (origWS._hermesHooked) return;

      const HookedWS = function (...args) {
        const ws = new origWS(...args);
        ws.addEventListener('message', (e) => {
          try {
            const data = typeof e.data === 'string' ? e.data : '';
            // Socket.IO 格式: 42["event",{...}]
            if (data.includes('run.completed') || data.includes('"event":"run.completed"')) {
              onTaskComplete();
            }
          } catch (_) {}
        });
        return ws;
      };
      HookedWS._hermesHooked = true;
      window.WebSocket = HookedWS;
      clearInterval(check);
      console.log('[Hermes Sound] WebSocket hook 已安装');
    }, 1000);
    // 10秒后停止尝试
    setTimeout(() => clearInterval(check), 10000);
  }

  // 方法2: 监听自定义事件（WebUI 内部 dispatch）
  window.addEventListener('auto-play-speech', () => {
    onTaskComplete();
  });

  // 方法3: MutationObserver 监听 streaming 状态变化（备用）
  function watchStreamingState() {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        // 检测 "正在思考" 或 streaming 指示器消失
        if (m.removedNodes.length) {
          for (const node of m.removedNodes) {
            if (node.nodeType === 1) {
              const text = node.textContent || '';
              const cls = node.className || '';
              if (
                cls.toString().includes('thinking') ||
                cls.toString().includes('streaming') ||
                cls.toString().includes('loading') ||
                cls.toString().includes('typing') ||
                text.includes('正在思考') ||
                text.includes('Thinking')
              ) {
                // 延迟确认，避免误触
                setTimeout(() => {
                  if (document.querySelector('.thinking, .streaming, .loading, [class*="typing"]') === null) {
                    // onTaskComplete(); // 备用方案，取消注释启用
                  }
                }, 500);
              }
            }
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  // ============ 初始化 ============

  // 添加悬浮测试按钮
  function addTestButton() {
    const btn = document.createElement('div');
    btn.innerHTML = '🔔';
    btn.title = '点击测试音效';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;width:44px;height:44px;border-radius:50%;background:#7c3aed;color:white;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;box-shadow:0 2px 12px rgba(124,58,237,0.4);transition:transform 0.2s;';
    btn.onmouseenter = () => btn.style.transform = 'scale(1.15)';
    btn.onmouseleave = () => btn.style.transform = 'scale(1)';
    btn.onclick = () => {
      console.log('[Hermes Sound] 手动测试播放');
      playSound();
      flashTitle();
      btn.style.transform = 'scale(0.85)';
      setTimeout(() => btn.style.transform = 'scale(1)', 200);
    };
    document.body.appendChild(btn);
  }

  // 首次交互后解锁 AudioContext
  function unlockAudio() {
    getCtx().resume();
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
  }
  document.addEventListener('click', unlockAudio);
  document.addEventListener('keydown', unlockAudio);

  // 请求通知权限
  if (CONFIG.browserNotification && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // 启动拦截
  hookSocketIO();

  // 添加测试按钮
  if (document.readyState === 'complete') {
    addTestButton();
    watchStreamingState();
  } else {
    window.addEventListener('load', () => {
      addTestButton();
      watchStreamingState();
    });
  }

  console.log('[Hermes Sound] ✅ 已加载 - 音效:', CONFIG.sound, '音量:', CONFIG.volume);
})();
