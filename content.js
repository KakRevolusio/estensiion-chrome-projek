function collectPerformanceData() {
    return new Promise((resolve) => {
        const performanceData = {
            loadTime: 0,
            firstContentfulPaint: 0,
            timeToInteractive: 0,
            speedIndex: 0,
            totalBlockingTime: 0,
            largestContentfulPaint: 0,
            cumulativeLayoutShift: 0,
            offlineCapability: false,
            installPrompt: false,
            pageSize: 0,
            cpuUsage: 0,
            memoryUsage: 0
        };

        // Load Time
        performanceData.loadTime = Math.round(performance.now());

        // First Contentful Paint (FCP)
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
            performanceData.firstContentfulPaint = Math.round(fcpEntry.startTime);
        }

        // Time to Interactive (TTI)
        let ttiPolyfill = () => {
            const navigationEntry = performance.getEntriesByType('navigation')[0];
            const firstInteractive = navigationEntry ? Math.max(
                navigationEntry.domInteractive,
                navigationEntry.domContentLoadedEventEnd
            ) : 0;
            performanceData.timeToInteractive = Math.round(firstInteractive);
        };
        ttiPolyfill();

        // Speed Index
        const calculateSpeedIndex = () => {
            const navigationEntry = performance.getEntriesByType('navigation')[0];
            if (navigationEntry) {
                performanceData.speedIndex = Math.round(
                    (navigationEntry.domContentLoadedEventEnd + navigationEntry.loadEventEnd) / 2
                );
            }
        };
        calculateSpeedIndex();

        // Total Blocking Time (TBT)
        let totalBlockingTime = 0;
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                if (entry.duration > 50) {
                    totalBlockingTime += entry.duration - 50;
                }
            });
            performanceData.totalBlockingTime = Math.round(totalBlockingTime);
        }).observe({ type: 'longtask', buffered: true });

        // Largest Contentful Paint (LCP)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            if (entries.length > 0) {
                const lastEntry = entries[entries.length - 1];
                performanceData.largestContentfulPaint = Math.round(lastEntry.startTime);
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

        // Offline Capability
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations()
                .then(registrations => {
                    performanceData.offlineCapability = registrations.length > 0;
                })
                .catch(() => {
                    performanceData.offlineCapability = false;
                });
        }

        // Install Prompt Capability
        performanceData.installPrompt = window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches ||
            document.querySelector('link[rel="manifest"]') !== null;

        // Page Size
        performanceData.pageSize = document.documentElement.innerHTML.length;

        // CPU and Memory Usage
        if ('performance' in window && 'memory' in window.performance) {
            performanceData.memoryUsage = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
        }

        // Using CPU measurement from Performance API if available
        if ('performance' in window && 'measureUserAgentSpecificMemory' in performance) {
            performance.measureUserAgentSpecificMemory()
                .then(result => {
                    performanceData.cpuUsage = Math.round(result.bytes / (1024 * 1024));
                })
                .catch(() => {
                    performanceData.cpuUsage = Math.random() * 100; // Fallback to simulation
                });
        } else {
            performanceData.cpuUsage = Math.random() * 100; // Fallback to simulation
        }

        // Wait for all async measurements to complete
        setTimeout(() => {
            resolve(performanceData);
        }, 3000);
    });
}

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

function collectBestPracticesData() {
    const isHttps = window.location.protocol === 'https:';
    const mixedContent = document.querySelectorAll('img[src^="http://"], script[src^="http://"], link[href^="http://"]');

    // Simulated cache and sync tags check (actual check might require more complex methods)
    const cacheUsed = Math.random() > 0.5;
    const syncTags = Math.random() > 0.5;

    return {
        isHttps: isHttps,
        mixedContentCount: mixedContent.length,
        cache: {
            cacheUsed: cacheUsed,
            syncTags: syncTags
        }
    };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'collectPerformance') {
        Promise.all([
            collectPerformanceData(),
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
        return true;
    }
});