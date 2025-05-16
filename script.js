document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const searchQueryInput = document.getElementById('search-query');
    const googleResultsDiv = document.getElementById('google-results');
    const aiSummaryDiv = document.getElementById('ai-summary');
    // const aiSummaryContainer = document.getElementById('ai-summary-container'); // No longer needed with new layout

    let eventSource = null; // To keep track of the EventSource connection

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
            window.history.pushState({}, '', `?q=${encodeURIComponent(query)}`);
            performSearch(query);
        }
    });

    function performSearch(query) {
        // Close any existing connection
        if (eventSource) {
            eventSource.close();
        }

        // Use external loading functions if available, otherwise simple text
        if (typeof showAiLoading === 'function') showAiLoading(); else aiSummaryDiv.innerHTML = '<p class="text-gray-500 animate-pulse">AI generuje odpověď...</p>';
        if (typeof showGoogleLoading === 'function') showGoogleLoading(); else googleResultsDiv.innerHTML = '<p class="text-gray-500 animate-pulse">Načítám výsledky...</p>';
        
        aiSummaryDiv.innerHTML = ''; // Clear previous AI summary for streaming

        const encodedQuery = encodeURIComponent(query);
        // Ensure this URL points to your Vercel deployment or local backend during development
        const searchUrl = `https://search-backend-pi.vercel.app/api/search?q=${encodedQuery}`;
        // const searchUrl = `/api/search?q=${encodedQuery}`; // For local development if proxying

        eventSource = new EventSource(searchUrl);

        eventSource.onopen = () => {
            console.log("SSE connection established.");
        };

        eventSource.addEventListener('google_results', (event) => {
            const results = JSON.parse(event.data);
            displayGoogleResults(results);
        });

        let fullAiSummary = '';
        eventSource.addEventListener('ai_chunk', (event) => {
            const chunkData = JSON.parse(event.data);
            if (chunkData && chunkData.text) {
                fullAiSummary += chunkData.text;
                // For basic text rendering. If Markdown, you'd use a library here.
                // To avoid re-rendering entire HTML and potentially losing user selection or scroll:
                // It's better to append directly or use a more sophisticated rendering method.
                // For simplicity, we'll update textContent, but for complex HTML from AI, consider innerHTML.
                // Using textContent is safer against XSS if the AI output is not strictly controlled.
                // If AI provides Markdown, you'd collect `fullAiSummary` and then render it with a library.
                // For live streaming, appending nodes or using a library like Marked.js on `fullAiSummary` is common.
                const tempDiv = document.createElement('div');
                tempDiv.textContent = chunkData.text; // Sanitize by treating as text
                aiSummaryDiv.innerHTML += tempDiv.innerHTML.replace(/\n/g, '<br>'); // Basic line break conversion
            }
            // Ensure container is visible (already handled by default layout)
        });

        eventSource.addEventListener('ai_end', (event) => {
            console.log("AI stream finished:", event.data ? JSON.parse(event.data).message : "No message");
            // Optionally, use a library like 'marked' to render `fullAiSummary` if it's Markdown
            // Example: aiSummaryDiv.innerHTML = marked.parse(fullAiSummary);
            // For now, we've been appending chunks. If ai_end signals completion, we might do a final render or nothing.
            if (aiSummaryDiv.textContent.trim() === "" && (!event.data || JSON.parse(event.data).message !== "AI stream finished.")) {
                 aiSummaryDiv.innerHTML = '<p class="text-gray-500">AI odpověď není k dispozici.</p>';
            } else if (aiSummaryDiv.textContent.trim() === "") {
                 aiSummaryDiv.innerHTML = '<p class="text-gray-500">AI odpověď dokončena.</p>'; // or clear loading
            }
            eventSource.close();
        });
        
        eventSource.addEventListener('ai_error', (event) => {
            const errorData = JSON.parse(event.data);
            console.error('AI Error from server:', errorData.message);
            aiSummaryDiv.innerHTML = `<p class="text-red-500">Chyba AI: ${errorData.message}</p>`;
            eventSource.close();
        });

        eventSource.onerror = (error) => {
            console.error('EventSource failed:', error);
            googleResultsDiv.innerHTML = `<p class="text-red-500">Chyba spojení se serverem.</p>`;
            aiSummaryDiv.innerHTML = `<p class="text-red-500">Chyba spojení pro AI odpověď.</p>`;
            eventSource.close();
        };
    }

    function displayGoogleResults(results) {
        if (!results || results.length === 0) {
            googleResultsDiv.innerHTML = '<p class="text-gray-500">Nebyly nalezeny žádné výsledky.</p>';
            return;
        }
        let html = '';
        results.forEach(result => {
            // Using Tailwind classes for styling each result item
            html += `
                <div class="search-result-item py-4 border-b border-gray-200 last:border-b-0">
                    <h3 class="text-lg font-medium text-blue-600 hover:underline">
                        <a href="${result.link}" target="_blank" rel="noopener noreferrer">${result.title}</a>
                    </h3>
                    <p class="text-sm text-green-600 truncate">${result.displayLink || result.link}</p>
                    <p class="text-sm text-gray-600 mt-1">${result.snippet}</p>
                </div>
            `;
        });
        googleResultsDiv.innerHTML = html;
    }

    // displayAiSummary is now handled by stream listeners directly appending to aiSummaryDiv
});