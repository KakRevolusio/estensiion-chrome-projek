const viewports = {
  desktop: { width: 1366, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

// Function to connect to Chrome DevTools Protocol (CDP)
function applyThrottling(tabId, callback) {
    if (!tabId) {
        console.error("Error: tabId is invalid.");
        return;
    }

    // Attach debugger
    chrome.debugger.attach({tabId}, '1.3', () => {
        if (chrome.runtime.lastError) {
            console.error("Error attaching debugger:", chrome.runtime.lastError.message);
            return;
        }

        console.log("Debugger attached successfully.");

        // Apply CPU throttling (6x slower)
        chrome.debugger.sendCommand({tabId}, 'Emulation.setCPUThrottlingRate', { rate: 6 }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error setting CPU throttling:", chrome.runtime.lastError.message);
                return;
            }

            // Apply Network Throttling (Good 3G simulation)
            chrome.debugger.sendCommand({tabId}, 'Network.emulateNetworkConditions', {
                offline: false,
                latency: 400, // 400ms of latency
                downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
                uploadThroughput: 750 * 1024 / 8 // 750 Kbps
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error applying network throttling:", chrome.runtime.lastError.message);
                    return;
                }
                console.log("Throttling applied successfully.");
                callback();
            });
        });
    });
}

// Function to remove throttling and detach debugger
function removeThrottling(tabId) {
    chrome.debugger.detach({tabId}, () => {
        if (chrome.runtime.lastError) {
            console.error("Error detaching debugger:", chrome.runtime.lastError.message);
        } else {
            console.log("Debugger detached successfully.");
        }
    });
}

// Function to change the viewport size
function setViewport(viewport, callback) {
  chrome.windows.getCurrent({}, (window) => {
      chrome.windows.update(window.id, {
          width: viewport.width,
          height: viewport.height
      }, () => {
          console.log(`Viewport set to: ${viewport.width}x${viewport.height}`);
          setTimeout(callback, 2000); // Wait for 2 seconds to ensure the viewport change
      });
  });
}

function runPerformanceTest(viewportChoice) {
  let results = {};

  // Choose viewport based on user's choice
  const selectedViewport = viewports[viewportChoice] || viewports.desktop;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
          console.error('No valid active tab found.');
          return;
      }

      const tabId = activeTab.id;

      // Set viewport for the test
      setViewport(selectedViewport, () => {
          // Ensure no cache is used and reload the page
          chrome.tabs.reload(tabId, { bypassCache: true }, () => {
              console.log("Page reloaded with new viewport.");

              applyThrottling(tabId, () => {
                  // After applying throttling, execute content.js for the test
                  chrome.scripting.executeScript({
                      target: { tabId: tabId },
                      files: ['content.js']
                  }, () => {
                      chrome.tabs.sendMessage(tabId, { action: 'collectPerformance' }, (data) => {
                          if (chrome.runtime.lastError || !data) {
                              console.error(chrome.runtime.lastError ? chrome.runtime.lastError.message : 'No data received');
                              removeThrottling(tabId); // Remove throttling in case of error
                              return;
                          }

                          results = data;

                          // Send the results to the popup for display
                          chrome.runtime.sendMessage({ action: 'showResults', data: results });

                          // Remove throttling after test
                          removeThrottling(tabId);
                      });
                  });
              });
          });
      });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'runPerformanceTest') {
      // Run the test with selected viewport
      runPerformanceTest(request.viewport);
  }
});
