// Definisi viewport yang akan diuji
const viewports = [
    { name: 'desktop', width: 1366, height: 768 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 667 }
];

// Service Worker initialization
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Menangani pesan dari popup menggunakan chrome.runtime.onMessage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'runPerformanceTest') {
        handlePerformanceTest(message.viewport, sender.tab?.id);
        return true; // Menandakan bahwa response akan dikirim secara asynchronous
    }
});

// Fungsi untuk menangani test performa
async function handlePerformanceTest(selectedViewport, sourceTabId) {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        if (!activeTab?.id) {
            throw new Error('No active tab found');
        }

        const results = await runPerformanceTestForViewports(selectedViewport, activeTab.id);
        
        // Kirim hasil ke popup
        chrome.runtime.sendMessage({
            action: 'testComplete',
            results: results
        });
    } catch (error) {
        console.error('Error in performance test:', error);
        chrome.runtime.sendMessage({
            action: 'testError',
            error: error.message
        });
    }
}

// Fungsi untuk menjalankan single test
async function runSingleTest(tabId, isPWAMode) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        });

        return new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, {
                action: 'collectPerformance',
                pwaStatusCheck: isPWAMode ? 'enabled' : 'disabled'
            }, (response) => {
                resolve(response || {
                    error: 'No response from content script'
                });
            });
        });
    } catch (error) {
        console.error('Error in single test:', error);
        return { error: error.message };
    }
}

// Fungsi untuk mengatur ukuran viewport
async function setViewportSize(viewport) {
    return new Promise((resolve) => {
        chrome.windows.getCurrent({}, (window) => {
            chrome.windows.update(window.id, {
                width: viewport.width,
                height: viewport.height + 150
            }, () => {
                setTimeout(resolve, 1000);
            });
        });
    });
}

// Fungsi untuk memeriksa ketersediaan Service Worker
async function checkServiceWorkerAvailability(tabId) {
    try {
        const result = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                return {
                    hasServiceWorker: 'serviceWorker' in navigator,
                    hasManifest: !!document.querySelector('link[rel="manifest"]'),
                    protocol: window.location.protocol
                };
            }
        });

        return result[0].result;
    } catch (error) {
        console.error('Error checking Service Worker availability:', error);
        return {
            hasServiceWorker: false,
            hasManifest: false,
            protocol: 'unknown'
        };
    }
}

// Fungsi untuk menonaktifkan Service Worker
async function disableServiceWorker(tabId) {
    try {
        const availability = await checkServiceWorkerAvailability(tabId);
        
        if (!availability.hasServiceWorker) {
            console.log('Service Worker tidak tersedia atau sudah dinonaktifkan');
            return true;
        }

        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: async () => {
                try {
                    if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        await Promise.all(registrations.map(r => r.unregister()));
                    }
                    
                    if ('caches' in window) {
                        const cacheKeys = await caches.keys();
                        await Promise.all(cacheKeys.map(key => caches.delete(key)));
                    }
                    
                    const manifestLink = document.querySelector('link[rel="manifest"]');
                    if (manifestLink) {
                        const manifestUrl = manifestLink.href;
                        const meta = document.createElement('meta');
                        meta.name = 'manifest-url';
                        meta.content = manifestUrl;
                        document.head.appendChild(meta);
                        manifestLink.remove();
                    }
                    
                    sessionStorage.setItem('pwaDisabled', 'true');
                    return true;
                } catch (error) {
                    console.error('Error dalam script disableServiceWorker:', error);
                    return false;
                }
            }
        });

        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
    } catch (error) {
        console.error('Error menonaktifkan Service Worker:', error);
        return false;
    }
}

// Fungsi untuk mengaktifkan Service Worker
async function enableServiceWorker(tabId) {
    try {
        const availability = await checkServiceWorkerAvailability(tabId);
        
        if (!availability.hasServiceWorker) {
            console.log('Service Worker API tidak tersedia');
            return false;
        }

        if (availability.protocol !== 'https:') {
            console.log('Service Worker membutuhkan HTTPS');
            return false;
        }

        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: async () => {
                try {
                    sessionStorage.removeItem('pwaDisabled');
                    
                    let manifestUrl = document.querySelector('meta[name="manifest-url"]')?.content;
                    if (!manifestUrl) {
                        const manifestLink = document.querySelector('link[rel="manifest"]');
                        manifestUrl = manifestLink?.href;
                    }

                    if (manifestUrl) {
                        const link = document.createElement('link');
                        link.rel = 'manifest';
                        link.href = manifestUrl;
                        document.head.appendChild(link);
                    }

                    if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        if (registrations.length === 0) {
                            await navigator.serviceWorker.register('/sw.js');
                        }
                    }

                    return true;
                } catch (error) {
                    console.error('Error enabling Service Worker:', error);
                    return false;
                }
            }
        });

        return true;
    } catch (error) {
        console.error('Error in enableServiceWorker:', error);
        return false;
    }
}

// Fungsi utama untuk menjalankan test performa
async function runPerformanceTestForViewports(selectedViewport, tabId) {
    const resultsWithPWA = {};
    const resultsWithoutPWA = {};
    
    const viewportsToTest = selectedViewport === 'all' 
        ? viewports 
        : viewports.filter(v => v.name === selectedViewport);

    try {
        // Test dengan PWA
        console.log('Starting PWA tests...');
        for (const viewport of viewportsToTest) {
            await setViewportSize(viewport);
            await enableServiceWorker(tabId);
            resultsWithPWA[viewport.name] = await runSingleTest(tabId, true);
        }

        // Test tanpa PWA
        console.log('Starting non-PWA tests...');
        for (const viewport of viewportsToTest) {
            await setViewportSize(viewport);
            await disableServiceWorker(tabId);
            await chrome.tabs.reload(tabId, { bypassCache: true });
            await new Promise(resolve => setTimeout(resolve, 2000));
            resultsWithoutPWA[viewport.name] = await runSingleTest(tabId, false);
        }

        // Re-enable PWA features after tests
        await enableServiceWorker(tabId);

        return {
            withPWA: resultsWithPWA,
            withoutPWA: resultsWithoutPWA
        };
    } catch (error) {
        console.error('Error during tests:', error);
        throw error;
    }
}

// Error handling
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

// Log unhandled errors
self.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error);
});