const viewports = [
    { name: 'desktop', width: 1366, height: 768 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 667 },
];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'runPerformanceTest') {
        runPerformanceTestForViewports(request.viewport);
    }
});

function runPerformanceTestForViewports(selectedViewport) {
    let resultsWithPWA = {};
    let resultsWithoutPWA = {};

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab || !activeTab.id) {
            console.error('No valid active tab found.');
            return;
        }

        const tabId = activeTab.id;
        const viewportsToTest = selectedViewport === 'all' ? viewports : viewports.filter(v => v.name === selectedViewport);

        const testViewport = (viewport, isPWAActive) => {
            return new Promise((resolve) => {
                setViewport(viewport, () => {
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        files: ['content.js']
                    }, () => {
                        const pwaStatusCheck = isPWAActive ? null : 'disabled';
                        chrome.tabs.sendMessage(tabId, { action: 'collectPerformance', pwaStatusCheck: pwaStatusCheck }, (data) => {
                            if (isPWAActive) {
                                resultsWithPWA[viewport.name] = data;
                            } else {
                                resultsWithoutPWA[viewport.name] = data;
                            }
                            resolve();
                        });
                    });
                });
            });
        };

        const runTestsForViewports = async (isPWAActive) => {
            for (const viewport of viewportsToTest) {
                await testViewport(viewport, isPWAActive);
            }
        };

        runTestsForViewports(true)
            .then(() => chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: disableServiceWorker
            }))
            .then(() => chrome.tabs.reload(tabId, { bypassCache: true }))
            .then(() => runTestsForViewports(false))
            .then(() => {
                chrome.runtime.sendMessage({
                    action: 'showComparisonResults',
                    dataWithPWA: resultsWithPWA,
                    dataWithoutPWA: resultsWithoutPWA
                });
                return chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: enableServiceWorker
                });
            });
    });
}

function setViewport(viewport, callback) {
    chrome.windows.getCurrent({}, (window) => {
        chrome.windows.update(window.id, {
            width: viewport.width,
            height: viewport.height
        }, () => {
            setTimeout(callback, 2000);
        });
    });
}

function disableServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (let registration of registrations) {
                registration.unregister();
            }
        });
    }
}

function enableServiceWorker() {
    window.location.reload();
}