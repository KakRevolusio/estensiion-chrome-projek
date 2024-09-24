// Fungsi untuk menghentikan service worker sementara untuk pengujian tanpa PWA
function disableServiceWorker() {
  return new Promise((resolve) => {
      if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
              for (let registration of registrations) {
                  registration.unregister(); // Hentikan service worker
              }
              resolve(true);
          });
      } else {
          resolve(false); // Jika tidak ada service worker, langsung lanjut
      }
  });
}

// Fungsi untuk mengaktifkan kembali service worker setelah pengujian
function enableServiceWorker() {
  return new Promise((resolve) => {
      window.location.reload(); // Muat ulang halaman untuk mendaftarkan kembali service worker
      resolve(true);
  });
}

// Fungsi untuk mengecek apakah situs menggunakan PWA
function checkPWAStatus() {
  let hasServiceWorker = false;
  let hasManifest = false;
  let isOfflineCapable = false;

  // Cek apakah ada service worker yang terdaftar
  if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration) {
              hasServiceWorker = true;
          }
      });
  }

  // Cek apakah ada manifest PWA di halaman
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
      hasManifest = true;
  }

  // Cek apakah halaman bisa diakses secara offline
  if (navigator.onLine === false) {
      isOfflineCapable = true;
  }

  return {
      hasServiceWorker: hasServiceWorker,
      hasManifest: hasManifest,
      isOfflineCapable: isOfflineCapable,
      isPWA: hasServiceWorker && hasManifest
  };
}

// Mengumpulkan data performa
function collectPerformanceData() {
  const performanceTiming = window.performance.timing;
  const loadTime = performanceTiming.loadEventEnd - performanceTiming.navigationStart;
  const firstContentfulPaint = performanceTiming.responseEnd - performanceTiming.requestStart;

  const lcp = 0; // Placeholder untuk LCP (Largest Contentful Paint)
  const cls = 0; // Placeholder untuk CLS (Cumulative Layout Shift)

  const resources = window.performance.getEntriesByType('resource');
  const renderBlockingResources = resources.filter(resource =>
      resource.initiatorType === 'script' || resource.initiatorType === 'link'
  );

  return {
      loadTime: loadTime || 'N/A',
      firstContentfulPaint: firstContentfulPaint || 'N/A',
      largestContentfulPaint: lcp || 'N/A',
      cumulativeLayoutShift: cls || 'N/A',
      renderBlockingResources: renderBlockingResources.length,
      pageSize: document.documentElement.innerHTML.length
  };
}

// Mengumpulkan data SEO
function collectSEOData() {
  const title = document.querySelector('title') ? document.querySelector('title').innerText : 'No Title';
  const metaDescription = document.querySelector('meta[name="description"]') ?
      document.querySelector('meta[name="description"]').content : 'No Description';
  const metaKeywords = document.querySelector('meta[name="keywords"]') ?
      document.querySelector('meta[name="keywords"]').content : 'No Keywords';
  const headings = document.querySelectorAll('h1, h2, h3');

  return {
      title: title,
      metaDescription: metaDescription,
      metaKeywords: metaKeywords,
      headingsCount: headings.length
  };
}

// Mengumpulkan data aksesibilitas
function collectAccessibilityData() {
  const images = document.querySelectorAll('img');
  const imagesWithoutAlt = Array.from(images).filter(img => !img.alt);

  const ariaLabels = document.querySelectorAll('[aria-label]');
  const elementsWithoutAria = document.querySelectorAll('[role]:not([aria-label])');

  return {
      imagesWithoutAlt: imagesWithoutAlt.length,
      ariaLabels: ariaLabels.length,
      elementsWithoutAria: elementsWithoutAria.length
  };
}

// Mengumpulkan data best practices
function collectBestPracticesData() {
  const isHttps = window.location.protocol === 'https:';
  const mixedContent = document.querySelectorAll('img[src^="http://"], script[src^="http://"], link[href^="http://"]');

  return {
      isHttps: isHttps,
      mixedContentCount: mixedContent.length
  };
}

// Menguji responsivitas UI
function collectResponsivenessData() {
  const isResponsive = window.matchMedia("(max-width: 600px)").matches;
  return { isResponsive: isResponsive };
}

// Mengumpulkan data First Input Delay (FID)
function collectFIDData() {
  let firstInputDelay = 0;

  new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
          firstInputDelay = entry.processingStart - entry.startTime;
      });
  }).observe({ type: 'first-input', buffered: true });

  return { firstInputDelay: firstInputDelay };
}

// Mengumpulkan data cache dan Background Sync
function collectCacheData() {
  if ('serviceWorker' in navigator) {
      return navigator.serviceWorker.getRegistration().then(registration => {
          const cachesUsed = registration && registration.active ? true : false;
          const syncTags = registration && registration.sync ? registration.sync.getTags() : Promise.resolve([]);

          return syncTags.then(tags => ({
              cacheUsed: cachesUsed,
              syncTags: tags.length > 0
          }));
      }).catch(error => {
          console.error("Error getting service worker registration:", error);
          return { cacheUsed: false, syncTags: false };
      });
  } else {
      return Promise.resolve({
          cacheUsed: false,
          syncTags: false
      });
  }
}

// Mengumpulkan penggunaan memori dan CPU
function collectResourceUsageData() {
  if (performance.memory) {
      return {
          memoryUsed: performance.memory.usedJSHeapSize,
          totalMemory: performance.memory.totalJSHeapSize
      };
  } else {
      return {
          memoryUsed: 'N/A',
          totalMemory: 'N/A'
      };
  }
}

// Memeriksa dukungan Web Share API
function collectWebShareSupportData() {
  return {
      supportsWebShare: navigator.share ? true : false
  };
}

// Listener untuk menerima pesan dari background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'collectPerformance') {
      const performanceData = collectPerformanceData();
      const seoData = collectSEOData();
      const accessibilityData = collectAccessibilityData();
      const bestPracticesData = collectBestPracticesData();
      const responsivenessData = collectResponsivenessData();
      const fidData = collectFIDData();

      collectCacheData().then(cacheData => {
          const resourceUsageData = collectResourceUsageData();
          const webShareData = collectWebShareSupportData();

          sendResponse({
              performance: performanceData || {},
              seo: seoData || {},
              accessibility: accessibilityData || {},
              bestPractices: bestPracticesData || {},
              responsiveness: responsivenessData || {},
              cache: cacheData || {},
              resourceUsage: resourceUsageData || {},
              webShare: webShareData || {},
              fid: fidData || {}
          });
      });

      return true;
  }
});
