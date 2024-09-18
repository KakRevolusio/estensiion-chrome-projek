function collectPerformanceData() {
    const performanceTiming = window.performance.timing;
    const loadTime = performanceTiming.loadEventEnd - performanceTiming.navigationStart;
    const timeToInteractive = performanceTiming.domInteractive - performanceTiming.navigationStart;
    const firstContentfulPaint = performanceTiming.responseEnd - performanceTiming.requestStart;
    
    return {
      loadTime: loadTime,
      timeToInteractive: timeToInteractive,
      firstContentfulPaint: firstContentfulPaint,
    };
  }
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'collectPerformance') {
      const performanceData = collectPerformanceData();
      sendResponse(performanceData);
    }
  });
  