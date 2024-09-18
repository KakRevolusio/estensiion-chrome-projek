const viewports = {
    desktop: { width: 1366, height: 768 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 },
  };
  
  function setViewport(viewport, callback) {
    chrome.windows.getCurrent({}, (window) => {
      chrome.windows.update(window.id, {
        width: viewport.width,
        height: viewport.height
      }, callback);
    });
  }
  
  function runPerformanceTest() {
    let results = {};
  
    setViewport(viewports.desktop, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content.js']
          }, () => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'collectPerformance' }, (desktopData) => {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
              }
              results.desktop = desktopData;
  
              setViewport(viewports.tablet, () => {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'collectPerformance' }, (tabletData) => {
                  if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                    return;
                  }
                  results.tablet = tabletData;
  
                  setViewport(viewports.mobile, () => {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'collectPerformance' }, (mobileData) => {
                      if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError.message);
                        return;
                      }
                      results.mobile = mobileData;
  
                      // Kirim hasil ke popup.js untuk ditampilkan
                      chrome.runtime.sendMessage({ action: 'showResults', data: results });
                    });
                  });
                });
              });
            });
          });
        } else {
          console.error('Tab ID tidak ditemukan atau tidak valid');
        }
      });
    });
  }
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'runPerformanceTest') {
      runPerformanceTest();
    }
  });
  