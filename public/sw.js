// Self Care Dashboard — Service Worker
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

self.addEventListener("message", (e)=>{ if(e.data==="skipWaiting") self.skipWaiting(); });

firebase.initializeApp({
  apiKey: "AIzaSyDWnqH3oR9IkxarG-pW9za4dHZVsJ5-qBI",
  authDomain: "self-care-487ca.firebaseapp.com",
  projectId: "self-care-487ca",
  storageBucket: "self-care-487ca.firebasestorage.app",
  messagingSenderId: "555397036454",
  appId: "1:555397036454:web:83f472588229bbee76b767"
});
const fbMessaging = firebase.messaging();

const RECENT_NOTIFICATIONS = new Map();
function notificationKey(payload){
  const d = (payload && payload.data) || {};
  const n = (payload && payload.notification) || {};
  return String(d.order_id || d.orderId || d.id || d.order_no || d.orderNo || n.tag || ((n.title||"") + "|" + (n.body||""))).replace(/\s+/g," ").trim().slice(0,180) || ("selfcare-order-" + Date.now());
}
function alreadyShown(key){
  const now = Date.now();
  for(const [k,t] of RECENT_NOTIFICATIONS){ if(now - t > 30000) RECENT_NOTIFICATIONS.delete(k); }
  if(RECENT_NOTIFICATIONS.has(key)) return true;
  RECENT_NOTIFICATIONS.set(key, now);
  return false;
}
fbMessaging.onBackgroundMessage((payload)=>{
  const n = (payload && payload.notification) || {};
  const d = (payload && payload.data) || {};

  // مهم: لو الرسالة جاية من Firebase وفيها notification object
  // المتصفح/FCM بيعرضها تلقائيًا في الخلفية.
  // لو عرضناها هنا كمان بـ showNotification هتظهر مرتين لنفس الأوردر.
  if(n && (n.title || n.body)) return;

  const key = notificationKey(payload);
  if(alreadyShown(key)) return;
  self.registration.showNotification(d.title || "🔔 طلب جديد", {
    body: d.body || "وصل طلب جديد",
    icon: "icon-192.png",
    badge: "icon-192.png",
    vibrate: [200,100,200],
    tag: "selfcare-order-" + key,
    renotify: false,
    data: { url: "./", key }
  });
});

const CACHE = "selfcare-admin-v63";
self.addEventListener("install", (e)=>{ self.skipWaiting(); });
self.addEventListener("activate", (e)=>{
  e.waitUntil(
    Promise.all([
      // امسح أي كاشات قديمة من نسخ سابقة
      caches.keys().then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )),
      self.clients.claim()
    ])
  );
});
self.addEventListener("fetch", (e)=>{
  if(e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // مانخزّنش استدعاءات API (Supabase, Firebase, etc) في الكاش
  const isApi = /supabase|firebase|googleapis|gstatic/i.test(url.hostname);
  e.respondWith(fetch(e.request).then(res=>{
    if(!isApi && res && res.ok && url.origin === self.location.origin){
      const copy = res.clone();
      caches.open(CACHE).then(c=> c.put(e.request, copy)).catch(()=>{});
    }
    return res;
  }).catch(()=> caches.match(e.request)));
});
self.addEventListener("notificationclick", (e)=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:"window", includeUncontrolled:true}).then(list=>{
    for(const c of list){ if("focus" in c) return c.focus(); }
    if(clients.openWindow) return clients.openWindow("./");
  }));
});
