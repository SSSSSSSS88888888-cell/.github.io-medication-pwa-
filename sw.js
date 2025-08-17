const CACHE_NAME = 'medication-pwa-v1.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js'
];

// Service Worker インストール
self.addEventListener('install', (event) => {
  console.log('[SW] インストール中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] キャッシュファイルを保存中...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] インストール完了！');
        self.skipWaiting();
      })
  );
});

// Service Worker アクティベート
self.addEventListener('activate', (event) => {
  console.log('[SW] アクティベート中...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] アクティベート完了！');
      return self.clients.claim();
    })
  );
});

// ネットワークリクエストをインターセプト
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにある場合は返す
        if (response) {
          console.log('[SW] キャッシュから返却:', event.request.url);
          return response;
        }
        
        // キャッシュにない場合はネットワークから取得
        console.log('[SW] ネットワークから取得:', event.request.url);
        return fetch(event.request).then((response) => {
          // 有効なレスポンスの場合はキャッシュに保存
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
      .catch(() => {
        // ネットワークエラーの場合、オフラインページを返す
        console.log('[SW] オフライン状態');
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});

// プッシュ通知受信
self.addEventListener('push', (event) => {
  console.log('[SW] プッシュ通知受信:', event);
  
  const options = {
    body: event.data ? event.data.text() : '服薬の時間です！',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'take',
        title: '服薬完了',
        icon: './icon-192.png'
      },
      {
        action: 'snooze',
        title: '後で',
        icon: './icon-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('💊 服薬リマインダー', options)
  );
});

// 通知クリック処理
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 通知クリック:', event);
  event.notification.close();

  if (event.action === 'take') {
    // 服薬完了アクション
    event.waitUntil(
      clients.openWindow('./?action=take')
    );
  } else if (event.action === 'snooze') {
    // スヌーズアクション（5分後に再通知）
    console.log('[SW] 5分後に再通知設定');
    setTimeout(() => {
      self.registration.showNotification('💊 服薬リマインダー（再通知）', {
        body: '服薬の時間です！',
        icon: './icon-192.png'
      });
    }, 5 * 60 * 1000);
  } else {
    // デフォルトアクション
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// バックグラウンド同期
self.addEventListener('sync', (event) => {
  console.log('[SW] バックグラウンド同期:', event.tag);
  
  if (event.tag === 'medication-sync') {
    event.waitUntil(syncMedicationData());
  }
});

// 服薬データ同期関数
async function syncMedicationData() {
  console.log('[SW] 服薬データを同期中...');
  // ここで必要に応じてサーバーとの同期処理を行う
  // 現在はローカルストレージのみの実装
}
