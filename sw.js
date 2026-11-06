/* Flow Atelier app shell. No user data, auth, APIs or third-party media. */
const PREFIX = 'flow-atelier-shell-';
const CACHE = PREFIX + "40aa259a9f015a44";
const ASSETS = ["/index.html","/icons/app-192.png","/icons/app-512.png","/assets/ClassBinderView-CVvSeFUt.js","/assets/CloudSyncPanel-AH97Qd2V.js","/assets/CloudSyncPanel-C61ONMnL.css","/assets/DesignSystemInspector-DDjnib7E.js","/assets/ExerciseAtlasView-Bn5nsLeb.css","/assets/ExerciseAtlasView-C-fOBCZE.js","/assets/FreeAiAssistantPanel-BopnyHhd.css","/assets/FreeAiAssistantPanel-DU0zbkie.js","/assets/InstructorScheduleView-B-lxXy8c.css","/assets/InstructorScheduleView-BalEBtlv.js","/assets/InstructorStudyDialog-CEGdJrH9.js","/assets/InstructorStudyDialog-DIMznb6u.css","/assets/LiveStageView-BJZOx6Ga.js","/assets/LiveStageView-DOn2U7Ql.css","/assets/LogSessionModal-C1kK4RwF.js","/assets/MotionDraftLabDialog-CAZ1_rOS.js","/assets/MotionDraftLabDialog-C_m8YmRP.css","/assets/OfflinePresetPicker-BC6a198e.css","/assets/OfflinePresetPicker-HwPoee_q.js","/assets/PfTabs-D0qqT2dt.js","/assets/RecoveryPreview-RZF3D_56.css","/assets/RecoveryPreview-xOz-p3JW.js","/assets/YouTubeClipModal-BuBLqRPW.css","/assets/YouTubeClipModal-DCxqiNZ_.js","/assets/freeAiAssistantSchema-BBgvdN0T.js","/assets/index-BKgY9LMQ.css","/assets/index-DxmYXATU.js","/assets/library-D12O_kY1.css","/assets/pilates-catalog-data-D9JQHW1f.js","/assets/pilates-motion-data-Dl6lyFwo.js","/assets/pilates-motion-ledgers-B5SnOnKG.js","/assets/teaching-DJ1F2-sy.css","/assets/teachingHistorySnapshot-DwYfOtk0.js","/assets/vendor-firebase-BIlTEimM.js","/assets/vendor-lucide-D4qqKsee.js","/assets/vendor-react-DS7RY252.js","/assets/youtube-catalog-Bc24ay1r.js"];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  // No skipWaiting: an open lesson must keep its existing version.
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)))));
  // No clients.claim or forced reload. Existing tabs keep their state.
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search) return;
  // Navigations outside the app root (including /__/auth/*) are never intercepted.
  if (request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')) {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match('/index.html');
      if (!cached) return Response.error();
      // Hosting cleanUrls may redirect /index.html to /. A navigation with
      // redirect: manual cannot use that redirected response in respondWith.
      // Copy only the cached document response, preserving body/status/headers.
      return cached.redirected
        ? new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers: cached.headers })
        : cached;
    }));
    return;
  }
  if (!ASSETS.includes(url.pathname) || url.pathname === '/index.html') return;
  event.respondWith(caches.open(CACHE).then(async (cache) => (await cache.match(url.pathname)) || fetch(request)));
});
