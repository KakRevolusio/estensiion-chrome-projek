const weights = {
    performance: {
        loadTime: 0.15,
        firstContentfulPaint: 0.15,
        timeToInteractive: 0.15,
        speedIndex: 0.10,
        totalBlockingTime: 0.10,
        largestContentfulPaint: 0.15,
        cumulativeLayoutShift: 0.10,
        offlineCapability: 0.05,
        installPrompt: 0.05
    },
    seo: {
        title: 0.4,
        metaDescription: 0.4,
        headingsCount: 0.2
    },
    accessibility: {
        imagesWithoutAlt: 0.4,
        ariaLabels: 0.3,
        elementsWithoutAria: 0.3
    },
    bestPractices: {
        isHttps: 0.3,
        mixedContentCount: 0.3,
        cacheUsed: 0.2,
        syncTags: 0.2
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const runTestButton = document.getElementById('runTest');
    const viewportSelect = document.getElementById('viewportSelect');
    const categorySelect = document.getElementById('categorySelect');
    const loadingElement = document.getElementById('loading');
    const resultsElement = document.getElementById('results');

    runTestButton.addEventListener('click', () => {
        const selectedViewport = viewportSelect.value;
        showLoading();
        chrome.runtime.sendMessage({ 
            action: 'runPerformanceTest',
            viewport: selectedViewport
        });
    });

    categorySelect.addEventListener('change', function() {
        const selectedCategory = this.value;
        const selectedViewport = viewportSelect.value;
        if (window.resultsWithPWA && window.resultsWithoutPWA) {
            showResultsByCategory(selectedCategory, window.resultsWithPWA, window.resultsWithoutPWA, selectedViewport);
        }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'testComplete') {
            hideLoading();
            hideError();
            if (request.results.error) {
                showError(request.results.error);
                return;
            }
            window.resultsWithPWA = request.results.withPWA;
            window.resultsWithoutPWA = request.results.withoutPWA;
            showResultsByCategory(categorySelect.value, window.resultsWithPWA, window.resultsWithoutPWA, viewportSelect.value);
        } else if (request.action === 'testError') {
            showError(request.error);
        }
    });
    
    function compareFeatureStatus(pwaStat, nonPwaStat, featureName) {
        if (pwaStat && !nonPwaStat) {
            return `<span class="comparison-better">PWA menyediakan ${featureName}</span>`;
        } else if (!pwaStat && !nonPwaStat) {
            return `<span class="comparison-neutral">Tidak tersedia di keduanya</span>`;
        } else if (pwaStat && nonPwaStat) {
            return `<span class="comparison-neutral">Tersedia di keduanya</span>`;
        } else {
            return `<span class="comparison-worse">Tidak berfungsi dengan benar</span>`;
        }
    }

    function showLoading() {
        loadingElement.style.display = 'block';
        resultsElement.innerHTML = '';
    }

    function hideLoading() {
        loadingElement.style.display = 'none';
    }

    function showResultsByCategory(category, resultsWithPWA, resultsWithoutPWA, selectedViewport) {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `<h2>Hasil untuk kategori: ${category}</h2>`;

        let htmlContent = `
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr>
                        <th>Ukuran Layar</th>
                        <th>Metrik</th>
                        <th>Dengan PWA</th>
                        <th>Tanpa PWA</th>
                        <th>Perbandingan</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const viewports = selectedViewport === 'all' ? Object.keys(resultsWithPWA) : [selectedViewport];

        viewports.forEach(viewport => {
            if (resultsWithPWA[viewport] && resultsWithoutPWA[viewport]) {
                const withPWA = resultsWithPWA[viewport];
                const withoutPWA = resultsWithoutPWA[viewport];

                const scorePWA = calculateScore(category, withPWA[category]);
                const scoreNonPWA = calculateScore(category, withoutPWA[category]);

                htmlContent += `
                    <tr>
                        <td colspan="5"><strong>${viewport.toUpperCase()} - Skor: PWA (${scorePWA}) vs Non-PWA (${scoreNonPWA})</strong></td>
                    </tr>
                `;

                if (category === 'performance') {
                    htmlContent += `
        <tr>
            <td rowspan="12"><strong>${viewport.toUpperCase()}</strong></td>
            <td>First Contentful Paint (FCP)</td>
            <td>${withPWA.performance.firstContentfulPaint} ms</td>
            <td>${withoutPWA.performance.firstContentfulPaint} ms</td>
            <td>${compareValues(withPWA.performance.firstContentfulPaint, withoutPWA.performance.firstContentfulPaint)}</td>
        </tr>
        <tr>
            <td>Time to Interactive (TTI)</td>
            <td>${withPWA.performance.timeToInteractive} ms</td>
            <td>${withoutPWA.performance.timeToInteractive} ms</td>
            <td>${compareValues(withPWA.performance.timeToInteractive, withoutPWA.performance.timeToInteractive)}</td>
        </tr>
        <tr>
            <td>Speed Index</td>
            <td>${withPWA.performance.speedIndex} ms</td>
            <td>${withoutPWA.performance.speedIndex} ms</td>
            <td>${compareValues(withPWA.performance.speedIndex, withoutPWA.performance.speedIndex)}</td>
        </tr>
        <tr>
            <td>Total Blocking Time (TBT)</td>
            <td>${withPWA.performance.totalBlockingTime} ms</td>
            <td>${withoutPWA.performance.totalBlockingTime} ms</td>
            <td>${compareValues(withPWA.performance.totalBlockingTime, withoutPWA.performance.totalBlockingTime)}</td>
        </tr>
        <tr>
            <td>Largest Contentful Paint (LCP)</td>
            <td>${withPWA.performance.largestContentfulPaint} ms</td>
            <td>${withoutPWA.performance.largestContentfulPaint} ms</td>
            <td>${compareValues(withPWA.performance.largestContentfulPaint, withoutPWA.performance.largestContentfulPaint)}</td>
        </tr>
        <tr>
            <td>Cumulative Layout Shift (CLS)</td>
            <td>${withPWA.performance.cumulativeLayoutShift}</td>
            <td>${withoutPWA.performance.cumulativeLayoutShift}</td>
            <td>${compareValues(withPWA.performance.cumulativeLayoutShift, withoutPWA.performance.cumulativeLayoutShift)}</td>
        </tr>
                <tr>
                    <td>Offline Capability</td>
                    <td>
                        ${createStatusIcon(withPWA.performance.offlineCapability)}
                        <br>
                        <small class="text-gray-600">${withPWA.performance.offlineCapabilityMessage}</small>
                    </td>
                    <td>
                        ${createStatusIcon(withoutPWA.performance.offlineCapability)}
                        <br>
                        <small class="text-gray-600">${withoutPWA.performance.offlineCapabilityMessage}</small>
                    </td>
                    <td>
                        ${compareFeatureStatus(
                            withPWA.performance.offlineCapability,
                            withoutPWA.performance.offlineCapability,
                            'Offline Capability'
                        )}
                    </td>
                </tr>

                <tr>
                    <td>Install Prompt</td>
                    <td>
                        ${createStatusIcon(withPWA.performance.installPrompt)}
                        <br>
                        <small class="text-gray-600">${withPWA.performance.installPromptMessage}</small>
                    </td>
                    <td>
                        ${createStatusIcon(withoutPWA.performance.installPrompt)}
                        <br>
                        <small class="text-gray-600">${withoutPWA.performance.installPromptMessage}</small>
                    </td>
                    <td>
                        ${compareFeatureStatus(
                            withPWA.performance.installPrompt,
                            withoutPWA.performance.installPrompt,
                            'Install Prompt'
                        )}
                    </td>
                </tr>
                
        <tr>
            <td>Waktu Muat</td>
            <td>${withPWA.performance.loadTime} ms</td>
            <td>${withoutPWA.performance.loadTime} ms</td>
            <td>${compareValues(withPWA.performance.loadTime, withoutPWA.performance.loadTime)}</td>
        </tr>
        <tr>
            <td>Ukuran Halaman</td>
            <td>${formatBytes(withPWA.performance.pageSize)}</td>
            <td>${formatBytes(withoutPWA.performance.pageSize)}</td>
            <td>${compareValues(withPWA.performance.pageSize, withoutPWA.performance.pageSize)}</td>
        </tr>
        <tr>
            <td>Penggunaan CPU</td>
            <td>${withPWA.performance.cpuUsage.toFixed(2)}%</td>
            <td>${withoutPWA.performance.cpuUsage.toFixed(2)}%</td>
            <td>${compareValues(withPWA.performance.cpuUsage, withoutPWA.performance.cpuUsage)}</td>
        </tr>
        <tr>
            <td>Penggunaan Memori</td>
            <td>${withPWA.performance.memoryUsage} MB</td>
            <td>${withoutPWA.performance.memoryUsage} MB</td>
            <td>${compareValues(withPWA.performance.memoryUsage, withoutPWA.performance.memoryUsage)}</td>
        </tr>
    `;
                } else if (category === 'seo') {
                    htmlContent += `
                        <tr>
                            <td rowspan="3"><strong>${viewport.toUpperCase()}</strong></td>
                            <td>Title</td>
                            <td>${withPWA.seo.title}</td>
                            <td>${withoutPWA.seo.title}</td>
                            <td>${withPWA.seo.title === withoutPWA.seo.title ? '<span style="color:green;">(Sama)</span>' : '<span style="color:red;">(Berbeda)</span>'}</td>
                        </tr>
                        <tr>
                            <td>Meta Description</td>
                            <td>${withPWA.seo.metaDescription}</td>
                            <td>${withoutPWA.seo.metaDescription}</td>
                            <td>${withPWA.seo.metaDescription === withoutPWA.seo.metaDescription ? '<span style="color:green;">(Sama)</span>' : '<span style="color:red;">(Berbeda)</span>'}</td>
                        </tr>
                        <tr>
                            <td>Jumlah Heading</td>
                            <td>${withPWA.seo.headingsCount}</td>
                            <td>${withoutPWA.seo.headingsCount}</td>
                            <td>${compareValues(withPWA.seo.headingsCount, withoutPWA.seo.headingsCount, false)}</td>
                        </tr>
                    `;
                } else if (category === 'accessibility') {
                    htmlContent += `
                        <tr>
                            <td rowspan="3"><strong>${viewport.toUpperCase()}</strong></td>
                            <td>Gambar tanpa alt</td>
                            <td>${withPWA.accessibility.imagesWithoutAlt}</td>
                            <td>${withoutPWA.accessibility.imagesWithoutAlt}</td>
                            <td>${compareValues(withPWA.accessibility.imagesWithoutAlt, withoutPWA.accessibility.imagesWithoutAlt)}</td>
                        </tr>
                        <tr>
                            <td>Elemen dengan aria-label</td>
                            <td>${withPWA.accessibility.ariaLabels}</td>
                            <td>${withoutPWA.accessibility.ariaLabels}</td>
                            <td>${compareValues(withPWA.accessibility.ariaLabels, withoutPWA.accessibility.ariaLabels, false)}</td>
                        </tr>
                        <tr>
                            <td>Elemen tanpa aria-label</td>
                            <td>${withPWA.accessibility.elementsWithoutAria}</td>
                            <td>${withoutPWA.accessibility.elementsWithoutAria}</td>
                            <td>${compareValues(withPWA.accessibility.elementsWithoutAria, withoutPWA.accessibility.elementsWithoutAria)}</td>
                        </tr>
                    `;
                } else if (category === 'bestPractices') {
                    htmlContent += `
                        <tr>
                            <td rowspan="4"><strong>${viewport.toUpperCase()}</strong></td>
                            <td>HTTPS</td>
                            <td>${createStatusIcon(withPWA.bestPractices.isHttps)}</td>
                            <td>${createStatusIcon(withoutPWA.bestPractices.isHttps)}</td>
                            <td>${withPWA.bestPractices.isHttps === withoutPWA.bestPractices.isHttps ? '<span style="color:green;">(Sama)</span>' : '<span style="color:red;">(Berbeda)</span>'}</td>
                        </tr>
                        <tr>
                            <td>Mixed Content</td>
                            <td>${withPWA.bestPractices.mixedContentCount}</td>
                            <td>${withoutPWA.bestPractices.mixedContentCount}</td>
                            <td>${compareValues(withPWA.bestPractices.mixedContentCount, withoutPWA.bestPractices.mixedContentCount)}</td>
                        </tr>
                        <tr>
                            <td>Cache Used</td>
                            <td>${createStatusIcon(withPWA.bestPractices.cache.cacheUsed)}</td>
                            <td>${createStatusIcon(withoutPWA.bestPractices.cache.cacheUsed)}</td>
                            <td>${withPWA.bestPractices.cache.cacheUsed === withoutPWA.bestPractices.cache.cacheUsed ? '<span style="color:green;">(Sama)</span>' : '<span style="color:red;">(Berbeda)</span>'}</td>
                        </tr>
                        <tr>
                            <td>Sync Tags</td>
                            <td>${createStatusIcon(withPWA.bestPractices.cache.syncTags)}</td>
                            <td>${createStatusIcon(withoutPWA.bestPractices.cache.syncTags)}</td>
                            <td>${withPWA.bestPractices.cache.syncTags === withoutPWA.bestPractices.cache.syncTags ? '<span style="color:green;">(Sama)</span>' : '<span style="color:red;">(Berbeda)</span>'}</td>
                        </tr>
                    `;
                }
            }
        });

        htmlContent += `</tbody></table>`;
        resultsDiv.innerHTML += htmlContent;
    }
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    function compareValues(valuePWA, valueNonPWA, isLowerBetter = true) {
        if (isLowerBetter) {
            return valuePWA < valueNonPWA ? '<span style="color:green;">(PWA lebih baik)</span>' : '<span style="color:red;">(Non-PWA lebih baik)</span>';
        } else {
            return valuePWA > valueNonPWA ? '<span style="color:green;">(PWA lebih baik)</span>' : '<span style="color:red;">(Non-PWA lebih baik)</span>';
        }
    }

    function createStatusIcon(condition) {
        return condition ? '<span style="color:green;">✔️</span>' : '<span style="color:red;">❌</span>';
    }

    function calculateScore(category, data) {
        if (!data || !weights[category]) {
            return 0;
        }
    
        let score = 0;
    
        switch(category) {
            case 'performance':
                // FCP Score (good: < 1800ms)
                score += calculateMetricScore(data.firstContentfulPaint, 3000, 1800) * 0.10;
                
                // TTI Score (good: < 3800ms)
                score += calculateMetricScore(data.timeToInteractive, 7300, 3800) * 0.10;
                
                // Speed Index (good: < 3400ms)
                score += calculateMetricScore(data.speedIndex, 5800, 3400) * 0.10;
                
                // TBT Score (good: < 200ms)
                score += calculateMetricScore(data.totalBlockingTime, 600, 200) * 0.10;
                
                // LCP Score (good: < 2500ms)
                score += calculateMetricScore(data.largestContentfulPaint, 4000, 2500) * 0.15;
                
                // CLS Score (good: < 0.1)
                score += calculateMetricScore(data.cumulativeLayoutShift, 0.25, 0.1) * 0.15;
                
                // Offline Capability & Install Prompt
                score += (data.offlineCapability ? 100 : 0) * 0.10;
                score += (data.installPrompt ? 100 : 0) * 0.05;
                
                // Load Time & Resource Usage
                score += calculateMetricScore(data.loadTime, 5000, 3000) * 0.05;
                score += calculateMetricScore(data.pageSize, 3145728, 1048576) * 0.05;
                score += calculateMetricScore(data.cpuUsage, 90, 50) * 0.025;
                score += calculateMetricScore(data.memoryUsage, 500, 100) * 0.025;
                break;
    
            case 'seo':
                score += (data.title?.length > 0 ? 100 : 0) * weights.seo.title;
                score += (data.metaDescription?.length > 0 ? 100 : 0) * weights.seo.metaDescription;
                score += calculateMetricScore(data.headingsCount || 0, 0, 6, true) * weights.seo.headingsCount;
                break;
    
            case 'accessibility':
                score += calculateMetricScore(data.imagesWithoutAlt || 0, 10, 0) * weights.accessibility.imagesWithoutAlt;
                score += calculateMetricScore(data.ariaLabels || 0, 0, 10, true) * weights.accessibility.ariaLabels;
                score += calculateMetricScore(data.elementsWithoutAria || 0, 10, 0) * weights.accessibility.elementsWithoutAria;
                break;
    
            case 'bestPractices':
                score += (data.isHttps ? 100 : 0) * weights.bestPractices.isHttps;
                score += calculateMetricScore(data.mixedContentCount || 0, 10, 0) * weights.bestPractices.mixedContentCount;
                score += (data.cache?.cacheUsed ? 100 : 0) * weights.bestPractices.cacheUsed;
                score += (data.cache?.syncTags ? 100 : 0) * weights.bestPractices.syncTags;
                break;
        }
    
        return Math.round(score);
    }

    function showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.querySelector('p').textContent = message;
        errorDiv.style.display = 'block';
        hideLoading();
    }
    
    function hideError() {
        const errorDiv = document.getElementById('error');
        errorDiv.style.display = 'none';
    }

    function calculateMetricScore(value, worstValue, bestValue, higherIsBetter = false) {
        if (higherIsBetter) {
            [worstValue, bestValue] = [bestValue, worstValue];
        }
        return Math.max(0, Math.min(100, ((value - worstValue) / (bestValue - worstValue)) * 100));
    }
});