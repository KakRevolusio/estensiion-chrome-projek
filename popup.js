// popup.js
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
        if (request.action === 'showComparisonResults') {
            hideLoading();
            window.resultsWithPWA = request.dataWithPWA;
            window.resultsWithoutPWA = request.dataWithoutPWA;
            const selectedCategory = categorySelect.value;
            const selectedViewport = viewportSelect.value;
            showResultsByCategory(selectedCategory, window.resultsWithPWA, window.resultsWithoutPWA, selectedViewport);
        }
    });

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
                            <td rowspan="9"><strong>${viewport.toUpperCase()}</strong></td>
                            <td>Waktu Muat</td>
                            <td>${withPWA.performance.loadTime} ms</td>
                            <td>${withoutPWA.performance.loadTime} ms</td>
                            <td>${compareValues(withPWA.performance.loadTime, withoutPWA.performance.loadTime)}</td>
                        </tr>
                        <tr>
                            <td>First Contentful Paint (FCP)</td>
                            <td>${withPWA.performance.firstContentfulPaint} ms</td>
                            <td>${withoutPWA.performance.firstContentfulPaint} ms</td>
                            <td>${compareValues(withPWA.performance.firstContentfulPaint, withoutPWA.performance.firstContentfulPaint)}</td>
                        </tr>
                        <tr>
                            <td>Largest Contentful Paint (LCP)</td>
                            <td>${withPWA.performance.largestContentfulPaint} ms</td>
                            <td>${withoutPWA.performance.largestContentfulPaint} ms</td>
                            <td>${compareValues(withPWA.performance.largestContentfulPaint, withoutPWA.performance.largestContentfulPaint)}</td>
                        </tr>
                        <tr>
                            <td>Total Blocking Time (TBT)</td>
                            <td>${withPWA.performance.totalBlockingTime} ms</td>
                            <td>${withoutPWA.performance.totalBlockingTime} ms</td>
                            <td>${compareValues(withPWA.performance.totalBlockingTime, withoutPWA.performance.totalBlockingTime)}</td>
                        </tr>
                        <tr>
                            <td>First Input Delay (FID)</td>
                            <td>${withPWA.performance.firstInputDelay} ms</td>
                            <td>${withoutPWA.performance.firstInputDelay} ms</td>
                            <td>${compareValues(withPWA.performance.firstInputDelay, withoutPWA.performance.firstInputDelay)}</td>
                        </tr>
                        <tr>
                            <td>Render Blocking Resources</td>
                            <td>${withPWA.performance.renderBlockingResources}</td>
                            <td>${withoutPWA.performance.renderBlockingResources}</td>
                            <td>${compareValues(withPWA.performance.renderBlockingResources, withoutPWA.performance.renderBlockingResources)}</td>
                        </tr>
                        <tr>
                            <td>Ukuran Halaman</td>
                            <td>${withPWA.performance.pageSize} bytes</td>
                            <td>${withoutPWA.performance.pageSize} bytes</td>
                            <td>${compareValues(withPWA.performance.pageSize, withoutPWA.performance.pageSize)}</td>
                        </tr>
                        <tr>
                            <td>CPU Usage</td>
                            <td>${withPWA.performance.cpuUsage.toFixed(2)}%</td>
                            <td>${withoutPWA.performance.cpuUsage.toFixed(2)}%</td>
                            <td>${compareValues(withPWA.performance.cpuUsage, withoutPWA.performance.cpuUsage)}</td>
                        </tr>
                        <tr>
                            <td>Memory Usage</td>
                            <td>${withPWA.performance.memoryUsage.toFixed(2)} MB</td>
                            <td>${withoutPWA.performance.memoryUsage.toFixed(2)} MB</td>
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
        let score = 0;
        const weights = {
            performance: {
                loadTime: 0.2,
                firstContentfulPaint: 0.1,
                largestContentfulPaint: 0.25,
                totalBlockingTime: 0.25,
                firstInputDelay: 0.2
            },
            seo: {
                title: 0.3,
                metaDescription: 0.3,
                headingsCount: 0.4
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

        if (category === 'performance') {
            score += calculateMetricScore(data.loadTime, 3000, 1000) * weights.performance.loadTime;
            score += calculateMetricScore(data.firstContentfulPaint, 3000, 1000) * weights.performance.firstContentfulPaint;
            score += calculateMetricScore(data.largestContentfulPaint, 4000, 2000) * weights.performance.largestContentfulPaint;
            score += calculateMetricScore(data.totalBlockingTime, 600, 200) * weights.performance.totalBlockingTime;
            score += calculateMetricScore(data.firstInputDelay, 300, 100) * weights.performance.firstInputDelay;
        } else if (category === 'seo') {
            score += (data.title.length > 0 ? 100 : 0) * weights.seo.title;
            score += (data.metaDescription.length > 0 ? 100 : 0) * weights.seo.metaDescription;
            score += calculateMetricScore(data.headingsCount, 0, 6, true) * weights.seo.headingsCount;
        } else if (category === 'accessibility') {
            score += calculateMetricScore(data.imagesWithoutAlt, 10, 0) * weights.accessibility.imagesWithoutAlt;
            score += calculateMetricScore(data.ariaLabels, 0, 10, true) * weights.accessibility.ariaLabels;
            score += calculateMetricScore(data.elementsWithoutAria, 10, 0) * weights.accessibility.elementsWithoutAria;
        } else if (category === 'bestPractices') {
            score += (data.isHttps ? 100 : 0) * weights.bestPractices.isHttps;
            score += calculateMetricScore(data.mixedContentCount, 10, 0) * weights.bestPractices.mixedContentCount;
            score += (data.cache.cacheUsed ? 100 : 0) * weights.bestPractices.cacheUsed;
            score += (data.cache.syncTags ? 100 : 0) * weights.bestPractices.syncTags;
        }

        return Math.round(score);
    }

    function calculateMetricScore(value, worstValue, bestValue, higherIsBetter = false) {
        if (higherIsBetter) {
            [worstValue, bestValue] = [bestValue, worstValue];
        }
        return Math.max(0, Math.min(100, ((value - worstValue) / (bestValue - worstValue)) * 100));
    }
});