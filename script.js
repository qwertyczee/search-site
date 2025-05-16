document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const searchQueryInput = document.getElementById('search-query');
    const googleResultsDiv = document.getElementById('google-results');
    const aiSummaryDiv = document.getElementById('ai-summary');
    const aiSummaryContainer = document.getElementById('ai-summary-container');

    // Získání query z URL
    const urlParams = new URLSearchParams(window.location.search);
    const queryFromUrl = urlParams.get('q');

    if (queryFromUrl) {
        searchQueryInput.value = queryFromUrl;
        performSearch(queryFromUrl);
    }

    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const query = searchQueryInput.value.trim();
        if (query) {
            // Aktualizace URL pro možnost sdílení/bookmarku
            window.history.pushState({}, '', `?q=${encodeURIComponent(query)}`);
            performSearch(query);
        }
    });

    async function performSearch(query) {
        googleResultsDiv.innerHTML = 'Načítám výsledky z Googlu...';
        aiSummaryDiv.innerHTML = 'Načítám AI odpověď...';
        aiSummaryContainer.style.display = 'block'; // Zobrazíme AI kontejner

        try {
            // POZOR: '/api/search' je relativní cesta k vašemu backendu
            // Při nasazení budete mít plnou URL vašeho backend serveru
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            displayGoogleResults(data.googleResults);
            displayAiSummary(data.aiSummary);

        } catch (error) {
            console.error('Chyba při vyhledávání:', error);
            googleResultsDiv.innerHTML = `<p style="color:red;">Nastala chyba při načítání výsledků: ${error.message}</p>`;
            aiSummaryDiv.innerHTML = `<p style="color:red;">Nastala chyba při generování AI odpovědi.</p>`;
        }
    }

    function displayGoogleResults(results) {
        if (!results || results.length === 0) {
            googleResultsDiv.innerHTML = 'Nebyly nalezeny žádné výsledky.';
            return;
        }
        let html = '';
        results.forEach(result => {
            html += `
                <div class="search-result">
                    <h3><a href="${result.link}" target="_blank">${result.title}</a></h3>
                    <p class="url">${result.displayLink || result.link}</p>
                    <p>${result.snippet}</p>
                </div>
            `;
        });
        googleResultsDiv.innerHTML = html;
    }

    function displayAiSummary(summary) {
        if (summary) {
            // Gemini může vracet markdown, potřebovali byste knihovnu na renderování (např. marked.js)
            // Pro jednoduchost zde jen text:
            aiSummaryDiv.textContent = summary;
            aiSummaryContainer.style.display = 'block';
        } else {
            aiSummaryDiv.textContent = 'AI shrnutí není k dispozici.';
            aiSummaryContainer.style.display = 'none';
        }
    }
});