document.getElementById('run-test').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'runPerformanceTest' });
  });
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showResults') {
      const results = request.data;
      const resultsDiv = document.getElementById('results');
  
      if (results && results.desktop && results.desktop.loadTime !== undefined) {
        resultsDiv.innerHTML = `
          <table>
            <tr>
              <th>Metrik</th>
              <th>Desktop</th>
              <th>Tablet</th>
              <th>Mobile</th>
            </tr>
            <tr>
              <td>Load Time</td>
              <td>${results.desktop.loadTime} ms</td>
              <td>${results.tablet ? results.tablet.loadTime : 'N/A'} ms</td>
              <td>${results.mobile ? results.mobile.loadTime : 'N/A'} ms</td>
            </tr>
            <tr>
              <td>Time to Interactive</td>
              <td>${results.desktop.timeToInteractive} ms</td>
              <td>${results.tablet ? results.tablet.timeToInteractive : 'N/A'} ms</td>
              <td>${results.mobile ? results.mobile.timeToInteractive : 'N/A'} ms</td>
            </tr>
            <tr>
              <td>First Contentful Paint</td>
              <td>${results.desktop.firstContentfulPaint} ms</td>
              <td>${results.tablet ? results.tablet.firstContentfulPaint : 'N/A'} ms</td>
              <td>${results.mobile ? results.mobile.firstContentfulPaint : 'N/A'} ms</td>
            </tr>
          </table>
        `;
      } else {
        console.error('Data performa tidak tersedia');
      }
    }
  });
  