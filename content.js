function collectPerformanceData() {
    return new Promise((resolve) => {
        const performanceData = {
            loadTime: 0,
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            totalBlockingTime: 0,
            renderBlockingResources: 0,
            pageSize: 0,
            firstInputDelay: 0,
            cpuUsage: 0,
            memoryUsage: 0
        };

        performanceData.loadTime = Math.round(performance.now());

        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
            performanceData.firstContentfulPaint = Math.round(fcpEntry.startTime);
        }

        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            if (entries.length > 0) {
                const lastEntry = entries[entries.length - 1];
                performanceData.largestContentfulPaint = Math.round(lastEntry.startTime);
            }
        }).observe({ type: 'largest-contentful-paint', buffered: true });

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

        new PerformanceObserver((entryList) => {
            const firstInput = entryList.getEntries()[0];
            if (firstInput) {
                performanceData.firstInputDelay = Math.round(firstInput.processingStart - firstInput.startTime);
            }
        }).observe({ type: 'first-input', buffered: true });

        const resources = performance.getEntriesByType('resource');
        performanceData.renderBlockingResources = resources.filter(resource =>
            resource.initiatorType === 'script' || resource.initiatorType === 'link'
        ).length;

        performanceData.pageSize = document.documentElement.innerHTML.length;

        // Simulate CPU and Memory usage (actual measurement might require more complex methods)
        performanceData.cpuUsage = Math.random() * 100; // Simulated CPU usage
        performanceData.memoryUsage = Math.random() * 1000; // Simulated Memory usage in MB

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