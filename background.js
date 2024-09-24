const viewports = {
  desktop: { width: 1366, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

// Function to change the viewport size
function setViewport(viewport, callback) {
  chrome.windows.getCurrent({}, (window) => {
      chrome.windows.update(window.id, {
          width: viewport.width,
          height: viewport.height
      }, () => {
          setTimeout(callback, 2000); // Wait 2 seconds to ensure viewport change
      });
  });
}

// Function to disable service worker in the tab
function disableServiceWorker() {
  if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let registration of registrations) {
              registration.unregister(); // Hentikan semua service worker
          }
      });
  }
}

// Function to enable service worker in the tab
function enableServiceWorker() {
  window.location.reload(); // Reload halaman untuk mendaftarkan ulang service worker
}

// Function to run performance test
function runPerformanceTest(viewportChoice) {
  let resultsWithPWA = {};
  let resultsWithoutPWA = {};

  // Pilih viewport berdasarkan pilihan pengguna
  const selectedViewport = viewports[viewportChoice] || viewports.desktop;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
          console.error('No valid active tab found.');
          return;
      }

      const tabId = activeTab.id;

      // Set viewport untuk pengujian dengan PWA aktif
      setViewport(selectedViewport, () => {
          chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content.js']
          }, () => {
              // Pengujian performa dengan PWA aktif
              chrome.tabs.sendMessage(tabId, { action: 'collectPerformance' }, (dataWithPWA) => {
                  resultsWithPWA = dataWithPWA;

                  // Nonaktifkan service worker untuk pengujian tanpa PWA
                  chrome.scripting.executeScript({
                      target: { tabId: tabId },
                      func: disableServiceWorker // Nonaktifkan service worker di dalam tab
                  }, () => {
                      chrome.tabs.reload(tabId, { bypassCache: true }, () => {
                          // Pengujian performa dengan PWA dinonaktifkan
                          chrome.tabs.sendMessage(tabId, { action: 'collectPerformance', pwaStatusCheck: 'disabled' }, (dataWithoutPWA) => {
                              resultsWithoutPWA = dataWithoutPWA;

                              // Kirim hasil ke popup.js untuk ditampilkan
                              chrome.runtime.sendMessage({
                                  action: 'showComparisonResults',
                                  dataWithPWA: resultsWithPWA,
                                  dataWithoutPWA: resultsWithoutPWA
                              });

                              // Aktifkan kembali service worker setelah pengujian
                              chrome.scripting.executeScript({
                                  target: { tabId: tabId },
                                  func: enableServiceWorker // Aktifkan service worker kembali di dalam tab
                              });
                          });
                      });
                  });
              });
          });
      });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'runPerformanceTest') {
      // Jalankan pengujian dengan viewport yang dipilih
      runPerformanceTest(request.viewport);
  }
});
