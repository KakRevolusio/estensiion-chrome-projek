document.getElementById('runTest').addEventListener('click', () => {
    // Kirim pesan ke background.js untuk menjalankan pengujian
    chrome.runtime.sendMessage({ action: 'runPerformanceTest' });
});

// Fungsi untuk membuat ikon centang atau silang
function createStatusIcon(condition) {
    return condition ? '<span style="color:green;">✔️</span>' : '<span style="color:red;">❌</span>';
}

// Fungsi untuk membandingkan dua nilai dan memberikan tanda mana yang lebih baik
function compareValues(valuePWA, valueNonPWA, isLowerBetter = true) {
    if (isLowerBetter) {
        return valuePWA < valueNonPWA ? '<span style="color:green;">(PWA lebih baik)</span>' : '<span style="color:red;">(Non-PWA lebih baik)</span>';
    } else {
        return valuePWA > valueNonPWA ? '<span style="color:green;">(PWA lebih baik)</span>' : '<span style="color:red;">(Non-PWA lebih baik)</span>';
    }
}

// Fungsi untuk menampilkan hasil berdasarkan kategori yang dipilih
function showResultsByCategory(category, resultsWithPWA, resultsWithoutPWA) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<h2>Hasil untuk kategori: ${category}</h2>`;

    let htmlContent = `
        <table style="width:100%; border-collapse:collapse;">
            <thead>
                <tr>
                    <th>Ukuran Layar</th>
                    <th>Metode</th>
                    <th>Dengan PWA</th>
                    <th>Tanpa PWA</th>
                    <th>Perbandingan</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (const viewport in resultsWithPWA) {
        const withPWA = resultsWithPWA[viewport];
        const withoutPWA = resultsWithoutPWA[viewport];

        
    if (category === 'performance') {
        htmlContent += `
            <tr>
                <td rowspan="5"><strong>${viewport.toUpperCase()}</strong></td>
                <td>Waktu Muat</td>
                <td>${withPWA.performance.loadTime} ms</td>
                <td>${withoutPWA.performance.loadTime} ms</td>
                <td>${compareValues(withPWA.performance.loadTime, withoutPWA.performance.loadTime)}</td>
            </tr>
            <tr>
                <td>Ukuran Halaman</td>
                <td>${withPWA.performance.pageSize} bytes</td>
                <td>${withoutPWA.performance.pageSize} bytes</td>
                <td>${compareValues(withPWA.performance.pageSize, withoutPWA.performance.pageSize)}</td>
            </tr>
            <tr>
                <td>Render Blocking Resources</td>
                <td>${withPWA.performance.renderBlockingResources}</td>
                <td>${withoutPWA.performance.renderBlockingResources}</td>
                <td>${compareValues(withPWA.performance.renderBlockingResources, withoutPWA.performance.renderBlockingResources)}</td>
            </tr>
            <tr>
                <td>CPU Usage</td>
                <td>${withPWA.resourceUsage.averageCpuUsage.toFixed(2)} ms</td>
                <td>${withoutPWA.resourceUsage.averageCpuUsage.toFixed(2)} ms</td>
                <td>${compareValues(withPWA.resourceUsage.averageCpuUsage, withoutPWA.resourceUsage.averageCpuUsage)}</td>
            </tr>
            <tr>
                <td>Memory Usage</td>
                <td>${(withPWA.resourceUsage.averageMemoryUsage / 1048576).toFixed(2)} MB</td>
                <td>${(withoutPWA.resourceUsage.averageMemoryUsage / 1048576).toFixed(2)} MB</td>
                <td>${compareValues(withPWA.resourceUsage.averageMemoryUsage, withoutPWA.resourceUsage.averageMemoryUsage)}</td>
            </tr>
        `;
    
        } else if (category === 'seo') {
            htmlContent += `
                <tr>
                    <td rowspan="2"><strong>${viewport.toUpperCase()}</strong></td>
                    <td>Title</td>
                    <td>${withPWA.seo.title}</td>
                    <td>${withoutPWA.seo.title}</td>
                    <td>${withPWA.seo.title === withoutPWA.seo.title ? '<span style="color:green;">(Sama)</span>' : '<span style="color:red;">(Berbeda)</span>'}</td>
                </tr>
                <tr>
                    <td>Description</td>
                    <td>${withPWA.seo.metaDescription}</td>
                    <td>${withoutPWA.seo.metaDescription}</td>
                    <td>${withPWA.seo.metaDescription === withoutPWA.seo.metaDescription ? '<span style="color:green;">(Sama)</span>' : '<span style="color:red;">(Berbeda)</span>'}</td>
                </tr>
            `;
        } else if (category === 'accessibility') {
            htmlContent += `
                <tr>
                    <td rowspan="1"><strong>${viewport.toUpperCase()}</strong></td>
                    <td>Gambar tanpa alt</td>
                    <td>${withPWA.accessibility.imagesWithoutAlt}</td>
                    <td>${withoutPWA.accessibility.imagesWithoutAlt}</td>
                    <td>${compareValues(withPWA.accessibility.imagesWithoutAlt, withoutPWA.accessibility.imagesWithoutAlt, false)}</td>
                </tr>
            `;
        } else if (category === 'bestPractices') {
            htmlContent += `
                <tr>
                    <td rowspan="1"><strong>${viewport.toUpperCase()}</strong></td>
                    <td>HTTPS</td>
                    <td>${createStatusIcon(withPWA.bestPractices.isHttps)}</td>
                    <td>${createStatusIcon(withoutPWA.bestPractices.isHttps)}</td>
                    <td>${withPWA.bestPractices.isHttps === withoutPWA.bestPractices.isHttps ? '<span style="color:green;">(Sama)</span>' : '<span style="color:red;">(Berbeda)</span>'}</td>
                </tr>
            `;
        }
    }

    htmlContent += `</tbody></table>`;
    resultsDiv.innerHTML += htmlContent;
}
const loadingElement = document.getElementById('loading');

function showLoading() {
    loadingElement.style.display = 'block';
}

function hideLoading() {
    loadingElement.style.display = 'none';
}

document.getElementById('runTest').addEventListener('click', () => {
    showLoading();
    // Kirim pesan ke background.js untuk menjalankan pengujian
    chrome.runtime.sendMessage({ action: 'runPerformanceTest' });
});

// Menerima hasil dari background.js dan menampilkan hasil pengujian
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showComparisonResults') {
        hideLoading();
        const resultsWithPWA = request.dataWithPWA;
        const resultsWithoutPWA = request.dataWithoutPWA;

        // Simpan hasil ke variabel global
        window.resultsWithPWA = resultsWithPWA;
        window.resultsWithoutPWA = resultsWithoutPWA;

        // Tampilkan hasil performa secara default
        showResultsByCategory('performance', resultsWithPWA, resultsWithoutPWA);
    }
});
// Menerima hasil dari background.js dan menampilkan hasil pengujian
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showComparisonResults') {
        const resultsWithPWA = request.dataWithPWA;
        const resultsWithoutPWA = request.dataWithoutPWA;

        // Simpan hasil ke variabel global
        window.resultsWithPWA = resultsWithPWA;
        window.resultsWithoutPWA = resultsWithoutPWA;

        // Tampilkan hasil performa secara default
        showResultsByCategory('performance', resultsWithPWA, resultsWithoutPWA);
    }
});

// Event listener untuk navigasi kategori
document.getElementById('categorySelect').addEventListener('change', function() {
    const selectedCategory = this.value;
    showResultsByCategory(selectedCategory, window.resultsWithPWA, window.resultsWithoutPWA);
});
