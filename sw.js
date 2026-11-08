// 保存していたゲームを消して、自分自身も解除する
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
    // 消すものがあった時だけ 1回読み直す（無限に読み直さないように）
    if (keys.length) {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(c => c.navigate('./index.html'));
    }
  })());
});
