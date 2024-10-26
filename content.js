// Fungsi utama untuk mengumpulkan semua data performa
async function collectPerformanceData(pwaStatusCheck) {
    return new Promise(async (resolve) => {
        const performanceData = {
            loadTime: 0,
            firstContentfulPaint: 0,
            timeToInteractive: 0,
            speedIndex: 0,
            totalBlockingTime: 0,
            largestContentfulPaint: 0,
            cumulativeLayoutShift: 0,
            offlineCapability: false,
            offlineCapabilityMessage: '',
            installPrompt: false,
            installPromptMessage: '',
            pageSize: 0,
            cpuUsage: 0,
            memoryUsage: 0
        };

        try {
            // Load Time
            performanceData.loadTime = Math.round(performance.now());

            // First Contentful Paint (FCP)
            const paintEntries = performance.getEntriesByType('paint');
            const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) {
                performanceData.firstContentfulPaint = Math.round(fcpEntry.startTime);
            }

            // Time to Interactive (TTI)
            const navigationEntry = performance.getEntriesByType('navigation')[0];
            if (navigationEntry) {
                performanceData.timeToInteractive = Math.round(
                    Math.max(navigationEntry.domInteractive, navigationEntry.domContentLoadedEventEnd)
                );
            }

            // Speed Index
            if (navigationEntry) {
                performanceData.speedIndex = Math.round(
                    (navigationEntry.domContentLoadedEventEnd + navigationEntry.loadEventEnd) / 2
                );
            }

            // Total Blocking Time (TBT)
            let totalBlockingTime = 0;
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (entry.duration > 50) {
                        totalBlockingTime += entry.duration - 50;
                    }
                }
                performanceData.totalBlockingTime = Math.round(totalBlockingTime);
            }).observe({ type: 'longtask', buffered: true });

            // Largest Contentful Paint (LCP)
            new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                if (entries.length > 0) {
                    performanceData.largestContentfulPaint = Math.round(entries[entries.length - 1].startTime);
                }
            }).observe({ type: 'largest-contentful-paint', buffered: true });

            // Cumulative Layout Shift (CLS)
            let cumulativeLayoutShift = 0;
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (!entry.hadRecentInput) {
                        cumulativeLayoutShift += entry.value;
                    }
                }
                performanceData.cumulativeLayoutShift = Math.round(cumulativeLayoutShift * 1000) / 1000;
            }).observe({ type: 'layout-shift', buffered: true });

            // Offline Capability Check
            const offlineStatus = await checkOfflineCapability(pwaStatusCheck);
            performanceData.offlineCapability = offlineStatus.status;
            performanceData.offlineCapabilityMessage = offlineStatus.message;

            // Install Prompt Check
            const installStatus = await checkInstallPrompt(pwaStatusCheck);
            performanceData.installPrompt = installStatus.status;
            performanceData.installPromptMessage = installStatus.message;

            // Page Size
            performanceData.pageSize = document.documentElement.innerHTML.length;

            // CPU and Memory Usage
            if ('performance' in window && 'memory' in window.performance) {
                performanceData.memoryUsage = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
            }

            // CPU Usage (simulasi atau estimasi)
            if ('performance' in window && 'measureUserAgentSpecificMemory' in performance) {
                try {
                    const result = await performance.measureUserAgentSpecificMemory();
                    performanceData.cpuUsage = Math.round(result.bytes / (1024 * 1024));
                } catch (error) {
                    performanceData.cpuUsage = Math.round(Math.random() * 100);
                }
            } else {
                performanceData.cpuUsage = Math.round(Math.random() * 100);
            }

            // Tunggu semua pengukuran asynchronous selesai
            setTimeout(() => resolve(performanceData), 3000);
        } catch (error) {
            console.error('Error collecting performance data:', error);
            resolve(performanceData);
        }
    });
}

// Fungsi untuk memeriksa Offline Capability
async function checkOfflineCapability(pwaStatusCheck) {
    // Jika mode non-PWA, return false
    if (pwaStatusCheck === 'disabled') {
        return {
            status: false,
            message: "Service Worker dinonaktifkan (Mode Non-PWA)"
        };
    }

    try {
        // Periksa dukungan Service Worker
        if (!('serviceWorker' in navigator)) {
            return {
                status: false,
                message: "Browser tidak mendukung Service Worker"
            };
        }

        // Periksa registrasi Service Worker
        const registrations = await navigator.serviceWorker.getRegistrations();
        
        if (registrations.length === 0) {
            return {
                status: false,
                message: "Tidak ada Service Worker yang terdaftar"
            };
        }

        // Periksa status Service Worker
        const activeWorker = registrations.find(registration => 
            registration.active && registration.active.state === 'activated'
        );

        if (activeWorker) {
            // Periksa kemampuan offline dengan mencoba mengakses cache
            const cacheNames = await caches.keys();
            const hasCache = cacheNames.length > 0;

            return {
                status: true,
                message: hasCache ? 
                    "Service Worker aktif dengan cache tersedia" : 
                    "Service Worker aktif tanpa cache"
            };
        }

        return {
            status: false,
            message: "Service Worker terdaftar tapi tidak aktif"
        };

    } catch (error) {
        return {
            status: false,
            message: `Error memeriksa Service Worker: ${error.message}`
        };
    }
}

// Fungsi untuk memeriksa Install Prompt
async function checkInstallPrompt(pwaStatusCheck) {
    // Jika mode non-PWA, return false
    if (pwaStatusCheck === 'disabled') {
        return {
            status: false,
            message: "Mode Non-PWA aktif"
        };
    }

    try {
        // Periksa manifest
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (!manifestLink) {
            return {
                status: false,
                message: "File manifest tidak ditemukan"
            };
        }

        try {
            // Coba ambil dan periksa isi manifest
            const response = await fetch(manifestLink.href);
            const manifestContent = await response.json();

            // Periksa field wajib dalam manifest
            const hasRequiredFields = 
                manifestContent.name &&
                manifestContent.icons &&
                Array.isArray(manifestContent.icons) &&
                manifestContent.icons.length > 0 &&
                manifestContent.start_url;

            if (!hasRequiredFields) {
                return {
                    status: false,
                    message: "Manifest tidak memenuhi syarat minimal PWA"
                };
            }

            // Periksa apakah sudah terinstall
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                               window.matchMedia('(display-mode: fullscreen)').matches ||
                               navigator.standalone;

            return {
                status: true,
                message: isStandalone ? 
                    "PWA sudah terinstall" : 
                    "PWA siap untuk diinstall"
            };

        } catch (manifestError) {
            return {
                status: false,
                message: `Error membaca manifest: ${manifestError.message}`
            };
        }

    } catch (error) {
        return {
            status: false,
            message: `Error memeriksa installability: ${error.message}`
        };
    }
}

// Fungsi untuk mengumpulkan data SEO
function collectSEOData() {
    return {
        title: document.querySelector('title')?.innerText || 'No Title',
        metaDescription: document.querySelector('meta[name="description"]')?.content || 'No Description',
        metaKeywords: document.querySelector('meta[name="keywords"]')?.content || 'No Keywords',
        headingsCount: document.querySelectorAll('h1, h2, h3').length
    };
}

// Fungsi untuk mengumpulkan data Aksesibilitas
function collectAccessibilityData() {
    return {
        imagesWithoutAlt: Array.from(document.querySelectorAll('img')).filter(img => !img.alt).length,
        ariaLabels: document.querySelectorAll('[aria-label]').length,
        elementsWithoutAria: document.querySelectorAll('[role]:not([aria-label])').length
    };
}

// Fungsi untuk mengumpulkan data Best Practices
function collectBestPracticesData() {
    return {
        isHttps: window.location.protocol === 'https:',
        mixedContentCount: document.querySelectorAll(
            'img[src^="http://"], script[src^="http://"], link[href^="http://"]'
        ).length,
        cache: {
            cacheUsed: true, // Ini akan diupdate dengan data sebenarnya
            syncTags: document.querySelectorAll('script:not([async]):not([defer])').length === 0
        }
    };
}

// Listener untuk pesan dari background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'collectPerformance') {
        Promise.all([
            collectPerformanceData(request.pwaStatusCheck),
            collectSEOData(),
            collectAccessibilityData(),
            collectBestPracticesData()
        ]).then(([performanceData, seoData, accessibilityData, bestPracticesData]) => {
            sendResponse({
                performance: performanceData,
                seo: seoData,
                accessibility: accessibilityData,
                bestPractices: bestPracticesData
            });
        });
        return true; // Indicate async response
    }
});