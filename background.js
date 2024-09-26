const viewports = [
    { name: 'desktop', width: 1366, height: 768 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 667 },
];

// Function to change the viewport size
function setViewport(viewport, callback) {
    chrome.windows.getCurrent({}, (window) => {
        chrome.windows.update(window.id, {
            width: viewport.width,
            height: viewport.height
        }, () => {
            setTimeout(callback, 2000); // Tunggu 2 detik untuk memastikan perubahan viewport
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

// Function to run performance test for all viewports
function runPerformanceTestForAllViewports() {
    let resultsWithPWA = {};
    let resultsWithoutPWA = {};

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab || !activeTab.id) {
            console.error('No valid active tab found.');
            return;
        }

        const tabId = activeTab.id;

        const testViewport = (viewport, isPWAActive, callback) => {
            setViewport(viewport, () => {
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                }, () => {
                    // Jalankan pengujian performa dengan PWA aktif atau nonaktif
                    const pwaStatusCheck = isPWAActive ? null : 'disabled';
                    chrome.tabs.sendMessage(tabId, { action: 'collectPerformance', pwaStatusCheck: pwaStatusCheck }, (data) => {
                        if (isPWAActive) {
                            resultsWithPWA[viewport.name] = data;
                        } else {
                            resultsWithoutPWA[viewport.name] = data;
                        }
                        callback();
                    });
                });
            });
        };

        const runTestsForAllViewports = (isPWAActive, callback) => {
            let index = 0;
            const runNextTest = () => {
                if (index < viewports.length) {
                    const viewport = viewports[index];
                    index++;
                    testViewport(viewport, isPWAActive, runNextTest);
                } else {
                    callback();
                }
            };
            runNextTest();
        };

        // Jalankan pengujian dengan PWA aktif
        runTestsForAllViewports(true, () => {
            // Setelah selesai, nonaktifkan service worker untuk pengujian tanpa PWA
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: disableServiceWorker // Nonaktifkan service worker di dalam tab
            }, () => {
                chrome.tabs.reload(tabId, { bypassCache: true }, () => {
                    // Jalankan pengujian dengan PWA dinonaktifkan
                    runTestsForAllViewports(false, () => {
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
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'runPerformanceTest') {
        // Jalankan pengujian di semua viewport
        runPerformanceTestForAllViewports();
    }
});
