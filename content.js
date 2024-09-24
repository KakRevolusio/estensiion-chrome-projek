// Mengumpulkan data performa (load time, ukuran halaman, blocking resources)
function collectPerformanceData() {
  const performanceTiming = window.performance.timing;
  const loadTime = performanceTiming.loadEventEnd - performanceTiming.navigationStart;
  const timeToInteractive = performanceTiming.domInteractive - performanceTiming.navigationStart;
  const firstContentfulPaint = performanceTiming.responseEnd - performanceTiming.requestStart;
  const resources = window.performance.getEntriesByType('resource');
  const renderBlockingResources = resources.filter(resource =>
      resource.initiatorType === 'script' || resource.initiatorType === 'link'
  );

  // Mengumpulkan LCP, CLS, FID
  let lcp = 0, cls = 0, fid = 0;

  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    lcp = entries[0].startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    entries.forEach((entry) => {
      cls += entry.value;
    });
  }).observe({ type: 'layout-shift', buffered: true });

  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    entries.forEach((entry) => {
      fid = entry.processingStart - entry.startTime;
    });
  }).observe({ type: 'first-input', buffered: true });

  return {
    loadTime: loadTime,
    timeToInteractive: timeToInteractive,
    firstContentfulPaint: firstContentfulPaint,
    renderBlockingResources: renderBlockingResources.length,
    pageSize: document.documentElement.innerHTML.length,
    largestContentfulPaint: lcp,
    cumulativeLayoutShift: cls,
    firstInputDelay: fid
  };
}


// Mengumpulkan data SEO (meta tag, heading structure)
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

// Mengumpulkan data aksesibilitas (alt text, aria-labels, dsb.)
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

// Mengumpulkan best practices data (HTTPS, mixed content)
function collectBestPracticesData() {
  const isHttps = window.location.protocol === 'https:';
  const mixedContent = document.querySelectorAll('img[src^="http://"], script[src^="http://"], link[href^="http://"]');

  return {
      isHttps: isHttps,
      mixedContentCount: mixedContent.length
  };
}

// Menguji apakah situs responsif terhadap layar mobile
function collectResponsivenessData() {
  const isResponsive = window.matchMedia("(max-width: 600px)").matches;

  return {
      isResponsive: isResponsive
  };
}

// Mengumpulkan data First Input Delay (FID)
function collectFIDData() {
  let firstInputDelay = 0;

  return new Promise((resolve) => {
      new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
              if (firstInputDelay === 0) {
                  firstInputDelay = entry.processingStart - entry.startTime;
                  resolve({ firstInputDelay });
              }
          });
      }).observe({ type: 'first-input', buffered: true });

      // Jika tidak ada input dalam 5 detik, kembalikan nilai default
      setTimeout(() => {
          resolve({ firstInputDelay });
      }, 10000);
  });
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

// Mengumpulkan penggunaan memori dari JS Heap
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

// Menguji apakah Web Share API didukung
function collectWebShareSupportData() {
  return {
      supportsWebShare: navigator.share ? true : false
  };
}

// Listener untuk menerima pesan dari background.js dan mengirim data performa
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'collectPerformance') {
      const performanceData = collectPerformanceData();
      const seoData = collectSEOData();
      const accessibilityData = collectAccessibilityData();
      const bestPracticesData = collectBestPracticesData();
      const responsivenessData = collectResponsivenessData();

      collectCacheData().then(cacheData => {
          const resourceUsageData = collectResourceUsageData();
          const webShareData = collectWebShareSupportData();
          const fidData = collectFIDData();

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

      return true; // Keep the message port open for async operations
  }
});


