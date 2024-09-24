document.getElementById('runTest').addEventListener('click', () => {
  const selectedViewport = document.getElementById('viewport').value;

  // Kirim pesan ke background.js untuk menjalankan pengujian dengan viewport yang dipilih
  chrome.runtime.sendMessage({ action: 'runPerformanceTest', viewport: selectedViewport });
});

// Menerima hasil dari background.js dan menampilkan hasil pengujian
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showComparisonResults') {
      const resultsWithPWA = request.dataWithPWA;
      const resultsWithoutPWA = request.dataWithoutPWA;
      const resultsDiv = document.getElementById('results');

      if (resultsWithPWA && resultsWithoutPWA) {
          // Tampilkan hasil perbandingan PWA vs non-PWA
          resultsDiv.innerHTML = `
              <h2>Perbandingan Performa (PWA vs Non-PWA)</h2>

              <div class="category">
                  <h3>Performa (Dengan PWA)</h3>
                  <p>Waktu Muat: ${resultsWithPWA.performance.loadTime} ms</p>
                  <p>Ukuran Halaman: ${resultsWithPWA.performance.pageSize} bytes</p>
                  <p>Render Blocking Resources: ${resultsWithPWA.performance.renderBlockingResources}</p>
              </div>

              <div class="category">
                  <h3>Performa (Tanpa PWA)</h3>
                  <p>Waktu Muat: ${resultsWithoutPWA.performance.loadTime} ms</p>
                  <p>Ukuran Halaman: ${resultsWithoutPWA.performance.pageSize} bytes</p>
                  <p>Render Blocking Resources: ${resultsWithoutPWA.performance.renderBlockingResources}</p>
              </div>

              <h3>Perbandingan:</h3>
              <p>Perbedaan Waktu Muat: ${Math.abs(resultsWithPWA.performance.loadTime - resultsWithoutPWA.performance.loadTime)} ms</p>
              <p>Perbedaan Ukuran Halaman: ${Math.abs(resultsWithPWA.performance.pageSize - resultsWithoutPWA.performance.pageSize)} bytes</p>
          `;
      } else {
          resultsDiv.innerHTML = '<p>Data perbandingan tidak tersedia.</p>';
      }
  }
});
