let loadingTimeout;

document.getElementById('runTest').addEventListener('click', () => {
    const selectedViewport = document.getElementById('viewport').value;

    // Tampilkan loading message
    const loadingDiv = document.getElementById('loading');
    loadingDiv.style.display = 'block';

    // Kirim pesan ke background.js untuk menjalankan pengujian dengan viewport yang dipilih
    chrome.runtime.sendMessage({ action: 'runPerformanceTest', viewport: selectedViewport });
});

// Fungsi untuk membuat progress bar dengan warna yang sesuai berdasarkan nilai
function createProgressBar(score) {
    let className = 'high-score'; // default ke warna hijau

    if (score < 50) {
        className = 'low-score'; // warna merah
    } else if (score < 90) {
        className = 'medium-score'; // warna oranye
    }

    return `
        <div class="progress">
            <div class="progress-bar ${className}" style="width: ${score}%">${score}</div>
        </div>
    `;
}

// Menerima hasil dari background.js dan menampilkan hasil pengujian
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showResults') {
        const results = request.data;
        const resultsDiv = document.getElementById('results');

        if (results) {
            // Hitung skor untuk setiap kategori
            const performanceScore = calculateScore(results.performance);
            const seoScore = calculateScore(results.seo);
            const accessibilityScore = calculateScore(results.accessibility);
            const bestPracticesScore = calculateScore(results.bestPractices);
            const responsivenessScore = results.responsiveness.isResponsive ? 100 : 0;
            const fidScore = results.fid.firstInputDelay < 100 ? 100 : (results.fid.firstInputDelay < 300 ? 50 : 0);
            const cacheScore = results.cache.cacheUsed ? 100 : 50;

            // Tampilkan hasil dengan progress bar untuk setiap kategori
            resultsDiv.innerHTML = `
                <div class="category">
                    <h2>Performance</h2>
                    ${createProgressBar(performanceScore)}
                    <p>Load Time: ${results.performance.loadTime || 'N/A'} ms</p>
                    <p>First Contentful Paint: ${results.performance.firstContentfulPaint || 'N/A'} ms</p>
                    <p>Largest Contentful Paint: ${results.performance.largestContentfulPaint || 'N/A'} ms</p>
                    <p>Cumulative Layout Shift: ${results.performance.cumulativeLayoutShift || 'N/A'}</p>
                    <p>Render Blocking Resources: ${results.performance.renderBlockingResources || 'N/A'}</p>
                </div>

                <div class="category">
                    <h2>SEO</h2>
                    ${createProgressBar(seoScore)}
                    <p>Title: ${results.seo.title || 'N/A'}</p>
                    <p>Description: ${results.seo.metaDescription || 'N/A'}</p>
                    <p>Keywords: ${results.seo.metaKeywords || 'N/A'}</p>
                    <p>Headings Count: ${results.seo.headingsCount || 'N/A'}</p>
                </div>

                <div class="category">
                    <h2>Accessibility</h2>
                    ${createProgressBar(accessibilityScore)}
                    <p>Images Without Alt: ${results.accessibility.imagesWithoutAlt || 'N/A'}</p>
                    <p>ARIA Labels: ${results.accessibility.ariaLabels || 'N/A'}</p>
                    <p>Elements Without ARIA: ${results.accessibility.elementsWithoutAria || 'N/A'}</p>
                </div>

                <div class="category">
                    <h2>Best Practices</h2>
                    ${createProgressBar(bestPracticesScore)}
                    <p>HTTPS: ${results.bestPractices.isHttps ? 'Yes' : 'No'}</p>
                    <p>Mixed Content Count: ${results.bestPractices.mixedContentCount || 'N/A'}</p>
                </div>

                <div class="category">
                    <h2>Responsiveness</h2>
                    ${createProgressBar(responsivenessScore)}
                    <p>Responsive: ${results.responsiveness.isResponsive ? 'Yes' : 'No'}</p>
                </div>

                <div class="category">
                    <h2>First Input Delay</h2>
                    ${createProgressBar(fidScore)}
                    <p>FID: ${results.fid.firstInputDelay || 'N/A'} ms</p>
                </div>

                <div class="category">
                    <h2>Cache Usage</h2>
                    ${createProgressBar(cacheScore)}
                    <p>Cache Used: ${results.cache.cacheUsed ? 'Yes' : 'No'}</p>
                </div>
            `;
        } else {
            resultsDiv.innerHTML = '<p>No results available.</p>';
        }

        // Sembunyikan loading message
        const loadingDiv = document.getElementById('loading');
        loadingDiv.style.display = 'none';
    }
});

// Fungsi untuk menghitung skor dari data performa
function calculateScore(data) {
    let score = 100; // Mulai dengan skor maksimal

    // Contoh penyesuaian skor berdasarkan performa
    if (data.loadTime && data.loadTime > 2000) {
        score -= 20;
    }
    if (data.firstContentfulPaint && data.firstContentfulPaint > 1000) {
        score -= 20;
    }
    if (data.largestContentfulPaint && data.largestContentfulPaint > 2500) {
        score -= 20;
    }
    if (data.cumulativeLayoutShift && data.cumulativeLayoutShift > 0.1) {
        score -= 20;
    }
    if (data.renderBlockingResources && data.renderBlockingResources > 2) {
        score -= 20;
    }

    return Math.max(0, score); // Pastikan skor tidak negatif
}
