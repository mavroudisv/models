// Global chart variables
let changesChart = null;
let comparisonChart = null;
let stabilityChart = null;

// Initialize application on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking Chart.js availability...');
    
    // Check Chart.js immediately
    if (typeof Chart !== 'undefined') {
        console.log('Chart.js is available:', Chart.version);
    } else {
        console.error('Chart.js is NOT available');
        // Try to load it manually
        setTimeout(() => {
            if (typeof Chart !== 'undefined') {
                console.log('Chart.js loaded after delay:', Chart.version);
            } else {
                console.error('Chart.js still not available after delay');
            }
        }, 1000);
    }
    
    // Hide all tab contents except the active one
    document.querySelectorAll('.tab-content').forEach(content => {
        if (!content.classList.contains('active')) {
            content.style.display = 'none';
        }
    });
    
    // Tab Navigation with more robust handling and debugging
    initTabNavigation();
    
    // Load signature data
    loadSignatureData();
    
    // Set up initial empty charts (only if Chart.js is available)
    setTimeout(() => {
        initializeCharts();
    }, 500); // Give Chart.js time to load
});

// Fix for tab navigation
function initTabNavigation() {
    console.log('Initializing tab navigation');
    const tabs = document.querySelectorAll('.nav-tab');
    console.log(`Found ${tabs.length} navigation tabs`);
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.textContent.trim();
            const tabId = tab.getAttribute('data-tab');
            console.log(`Tab clicked: ${tabName}, targeting content with ID: ${tabId}`);
            
            // Remove active class from all tabs
            document.querySelectorAll('.nav-tab').forEach(t => {
                t.classList.remove('active');
                t.classList.add('text-gray-500');
                t.classList.remove('text-gray-700');
            });
            
            // Add active class to current tab
            tab.classList.add('active');
            tab.classList.remove('text-gray-500');
            tab.classList.add('text-gray-700');
            
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            // Show selected tab content
            const selectedContent = document.getElementById(tabId);
            if (selectedContent) {
                selectedContent.classList.add('active');
                selectedContent.style.display = 'block';
                console.log(`Activated tab content: ${tabId}`);
            } else {
                console.error(`Could not find tab content with ID: ${tabId}`);
            }
        });
    });
}

// Initialize empty charts
function initializeCharts() {
    try {
        console.log('Initializing charts');
        
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }
        
        // Note: changesChart initialization removed since canvas doesn't exist in HTML
        // The comparisonChart and stabilityChart are initialized when needed
        
        console.log('Charts initialization complete');
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

// Function to load signature data
async function loadSignatureData() {
    try {
        console.log('Loading signature data');
        // Fetch data from signatures.json
        const data = await fetchSignaturesIndex();
        console.log('Fetched signature data:', data);
        
        if (!data || !data.models) {
            throw new Error('Invalid signature data format');
        }
        
        const { metadata, models } = data;
        
        // Update the last updated timestamp
        if (metadata && metadata.last_updated) {
            const lastUpdated = new Date(metadata.last_updated).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            // const lastUpdatedEl = document.getElementById('last-updated');
            // if (lastUpdatedEl) {
            //     lastUpdatedEl.textContent = `Last updated: ${lastUpdated}`;
            // }
        }
        
        // Update model cards
        updateModelCards(models);
        
        // Update the model selectors in comparison and history tabs
        updateModelSelectors(models);
        
        // Update charts with model data - commented out since changesChart canvas doesn't exist
        // updateChangesChart(models);
        
        // Set up event listeners
        setupEventListeners(models);
        
        console.log('Signature data loaded successfully');
    } catch (error) {
        console.error('Error loading signature data:', error);
        showErrorMessage('Failed to load signature data. Please try refreshing the page.');
        
        // Update the UI to show the error state
        const modelCards = document.getElementById('model-cards');
        if (modelCards) {
            modelCards.innerHTML = `
                <div class="col-span-3 bg-white rounded-lg shadow p-6 text-center">
                    <p class="text-red-600">Error loading signature data. Please check the console for details.</p>
                </div>
            `;
        }
    }
}

// Function to update model cards
function updateModelCards(models) {
    const modelCards = document.getElementById('model-cards');
    if (!modelCards) {
        console.warn('Model cards container not found');
        return;
    }
    
    modelCards.innerHTML = ''; // Clear existing cards
    console.log('Updating model cards');
    
    // Add cards for each model
    for (const [modelKey, modelData] of Object.entries(models)) {
        if (modelData.signatures && modelData.signatures.length > 0) {
            // Sort signatures by date/time (most recent first)
            const sortedSignatures = [...modelData.signatures].sort((a, b) => {
                // Parse dates - handle both date-only and date_time formats
                const parseDate = (dateStr) => {
                    if (dateStr.includes('_')) {
                        // Format: "2025-05-30_02-16-25"
                        const [datePart, timePart] = dateStr.split('_');
                        const [year, month, day] = datePart.split('-');
                        const [hour, minute, second] = timePart.split('-');
                        return new Date(year, month - 1, day, hour, minute, second);
                    } else {
                        // Format: "2025-05-30" - treat as end of day for proper sorting
                        return new Date(dateStr + 'T23:59:59');
                    }
                };
                
                const dateA = parseDate(a.date);
                const dateB = parseDate(b.date);
                return dateB - dateA; // Most recent first
            });
            
            const latestSignature = sortedSignatures[0]; // First one is most recent after sorting
            
            // Use the model_short_name as the display name (e.g., "Llama4_17b")
            const displayName = modelData.model_short_name || modelKey;
            
            let formattedDate;
            try {
                const dateStr = latestSignature.date;
                if (dateStr.includes('_')) {
                    // Format: "2025-05-30_02-16-25"
                    const [datePart, timePart] = dateStr.split('_');
                    const [year, month, day] = datePart.split('-');
                    const [hour, minute] = timePart.split('-');
                    const date = new Date(year, month - 1, day, hour, minute);
                    formattedDate = date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    }) + ' at ' + date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } else {
                    // Format: "2025-05-30"
                    formattedDate = new Date(dateStr).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    });
                }
            } catch (e) {
                formattedDate = latestSignature.date;
            }
            
            // Calculate if there's been any changes
            const hasMultipleSignatures = sortedSignatures.length > 1;
            const hasChanges = hasMultipleSignatures && sortedSignatures.some(sig => 
                sig.hash !== latestSignature.hash
            );
            
            const changeStatus = hasChanges 
                ? `Changed on ${formattedDate}` 
                : "No changes detected";
                
            const stabilityClass = hasChanges ? "status-changed" : "status-consistent";
            const stabilityText = hasChanges ? "Changed" : "Consistent";
            
            // Get creator and service provider from model level data
            let providerDisplay = '';
            if (modelData.creator || modelData.service_provider) {
                const parts = [];
                if (modelData.creator) parts.push(`Developer: ${modelData.creator}`);
                if (modelData.service_provider && modelData.service_provider !== modelData.creator) {
                    parts.push(`Provider: ${modelData.service_provider}`);
                }
                if (parts.length > 0) {
                    providerDisplay = `<div class="provider-tag">${parts.join(' | ')}</div>`;
                }
            }
            
            const cardHtml = `
                <div class="signature-card bg-white rounded-lg shadow overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                        <div class="font-bold text-xl text-gray-800 mb-1">${displayName}</div>
                        <div class="text-sm text-gray-600 mb-2">Latest: ${formattedDate}</div>
                        ${providerDisplay}
                    </div>
                    <div class="px-6 py-4 space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700 font-medium">Hash:</span>
                            <span class="hash-display font-mono text-gray-600">${latestSignature.hash}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700 font-medium">Stability:</span>
                            <span class="${stabilityClass}">${stabilityText}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700 font-medium">Changes:</span>
                            <span class="text-gray-600 text-sm">${changeStatus}</span>
                        </div>
                    </div>
                    <div class="px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-100">
                        <a href="signature-details.html?file=${latestSignature.file}" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center group transition-colors">
                            View details 
                            <svg class="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </a>
                    </div>
                </div>
            `;
            
            modelCards.innerHTML += cardHtml;
        }
    }
    
    // If no models were added, show a message
    if (modelCards.innerHTML === '') {
        modelCards.innerHTML = `
            <div class="col-span-3 bg-white rounded-lg shadow-lg p-8 text-center">
                <div class="mb-4">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">No Model Signatures</h3>
                <p class="text-gray-600">No model signatures are currently available.</p>
            </div>
        `;
    }
    
    console.log('Model cards updated');
}

// Function to update model selectors
function updateModelSelectors(models) {
    const modelOptions = Object.entries(models).map(([modelKey, modelData]) => {
        // Use the model_short_name as the display name
        const displayName = modelData.model_short_name || modelKey;
        return `<option value="${modelKey}">${displayName}</option>`;
    }).join('');
    
    // Update all select elements with model options
    document.querySelectorAll('select').forEach(select => {
        const firstOption = select.querySelector('option:first-child');
        if (firstOption) {
            // Keep the first option and add the rest
            select.innerHTML = firstOption.outerHTML + modelOptions;
        }
    });
    
    console.log('Model selectors updated');
}

// Function to set up event listeners
function setupEventListeners(models) {
    // Set up history model selector to update timeline
    const historyModelSelect = document.getElementById('history-model-select');
    if (historyModelSelect) {
        historyModelSelect.addEventListener('change', () => {
            const selectedModel = historyModelSelect.value;
            if (selectedModel && models[selectedModel]) {
                updateHistoryTimeline(models[selectedModel]);
            }
        });
    }
    
    // Set up compare button
    const compareBtn = document.getElementById('compare-btn');
    if (compareBtn) {
        compareBtn.addEventListener('click', () => {
            const model1 = document.getElementById('model1-select').value;
            const model2 = document.getElementById('model2-select').value;
            
            if (model1 && model2 && models[model1] && models[model2]) {
                compareModels(models[model1], models[model2]);
            } else {
                alert('Please select two models to compare');
            }
        });
    }
    
    console.log('Event listeners set up');
}

// Function to update history timeline
function updateHistoryTimeline(modelData) {
    const timelineEl = document.getElementById('history-timeline');
    if (!timelineEl) {
        console.warn('History timeline container not found');
        return;
    }
    
    timelineEl.innerHTML = ''; // Clear existing timeline
    
    if (!modelData.signatures || modelData.signatures.length === 0) {
        timelineEl.innerHTML = `
            <div class="mb-8 relative timeline-node">
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-bold text-gray-800">No data available</h4>
                            <p class="text-sm text-gray-600">No signatures found for this model</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    // Sort signatures by date/time (most recent first)
    const sortedSignatures = [...modelData.signatures].sort((a, b) => {
        // Parse dates - handle both date-only and date_time formats
        const parseDate = (dateStr) => {
            if (dateStr.includes('_')) {
                // Format: "2025-05-30_02-16-25"
                const [datePart, timePart] = dateStr.split('_');
                const [year, month, day] = datePart.split('-');
                const [hour, minute, second] = timePart.split('-');
                return new Date(year, month - 1, day, hour, minute, second);
            } else {
                // Format: "2025-05-30" - treat as end of day for proper sorting
                return new Date(dateStr + 'T23:59:59');
            }
        };
        
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateB - dateA; // Most recent first
    });
    
    // Generate timeline nodes for each signature
    sortedSignatures.forEach((signature, index) => {
        let formattedDate;
        try {
            const dateStr = signature.date;
            if (dateStr.includes('_')) {
                // Format: "2025-05-30_02-16-25"
                const [datePart, timePart] = dateStr.split('_');
                const [year, month, day] = datePart.split('-');
                const [hour, minute] = timePart.split('-');
                const date = new Date(year, month - 1, day, hour, minute);
                formattedDate = date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }) + ' at ' + date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else {
                // Format: "2025-05-30"
                formattedDate = new Date(dateStr).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            }
        } catch (e) {
            formattedDate = signature.date;
        }
        
        // Determine event title
        let eventTitle;
        if (index === sortedSignatures.length - 1) {
            eventTitle = "Baseline Signature";
        } else {
            // Compare current hash with previous hash (since array is sorted most recent first)
            const currentHash = signature.hash;
            const previousHash = sortedSignatures[index + 1].hash; // +1 because we're going backwards in time
            eventTitle = currentHash !== previousHash ? 
                "Signature Change Detected" : 
                "Signature Check (No Change)";
        }
        
        // Determine if this is the first signature
        const isFirst = index === sortedSignatures.length - 1;
        
        const nodeHtml = `
            <div class="mb-8 relative timeline-node">
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-bold text-gray-800">${eventTitle}</h4>
                            <p class="text-sm text-gray-600">${formattedDate}</p>
                        </div>
                        <span class="font-mono text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">${signature.hash}</span>
                    </div>
                    <div class="mt-2">
                        <p class="text-sm text-gray-700">
                            ${isFirst ? "Initial signature recorded for this model." : "New signature recorded. Distribution shows changes in token probabilities."}
                        </p>
                    </div>
                    <div class="mt-3">
                        <a href="${signature.file}" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">View signature details</a>
                    </div>
                </div>
            </div>
        `;
        
        timelineEl.innerHTML += nodeHtml;
    });
    
    // Update stability chart (only if canvas exists)
    const stabilityCanvas = document.getElementById('stabilityChart');
    if (stabilityCanvas) {
        updateStabilityChart(modelData);
    } else {
        console.log('Stability chart canvas not found - skipping chart update');
    }
    
    console.log('History timeline updated');
}

// Function to update changes chart
function updateChangesChart(models) {
    try {
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js is not loaded, skipping changes chart');
            return;
        }
        
        const changesCtx = document.getElementById('changesChart');
        if (!changesCtx) {
            console.warn('Changes chart canvas not found');
            return;
        }
        
        // Get all unique dates across models
        const allDates = new Set();
        const modelDates = {};
        const colors = {
            // Pre-defined colors for consistency
            default: [
                'rgba(79, 70, 229, 1)',  // Indigo
                'rgba(16, 185, 129, 1)', // Green
                'rgba(245, 158, 11, 1)', // Amber
                'rgba(239, 68, 68, 1)',  // Red
                'rgba(59, 130, 246, 1)'  // Blue
            ]
        };
        
        // Collect dates and changes
        Object.entries(models).forEach(([modelKey, modelData], index) => {
            if (modelData.signatures && modelData.signatures.length > 0) {
                modelDates[modelKey] = {};
                
                // Record all signature dates
                modelData.signatures.forEach(sig => {
                    allDates.add(sig.date);
                    // Record a change on this date
                    modelDates[modelKey][sig.date] = 1;
                });
            }
        });
        
        // Sort dates chronologically
        const sortedDates = Array.from(allDates).sort();
        
        // Create datasets for the chart
        const datasets = Object.entries(modelDates).map(([modelKey, dates], index) => {
            const color = colors.default[index % colors.default.length];
            const bgColor = color.replace('1)', '0.1)');
            
            // Use model_short_name as the display name
            const displayName = models[modelKey].model_short_name || modelKey;
            
            // Create data points - 1 if there was a change on that date, 0 otherwise
            const data = sortedDates.map(date => dates[date] || 0);
            
            return {
                label: displayName,
                data: data,
                borderColor: color,
                backgroundColor: bgColor,
                tension: 0.4
            };
        });
        
        // Format dates for display
        const formattedDates = sortedDates.map(date => {
            try {
                return new Date(date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
            } catch (e) {
                return date;
            }
        });
        
        // Update the chart
        if (changesChart) {
            changesChart.destroy();
        }
        
        changesChart = new Chart(changesCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: formattedDates,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Signature Changes per Model'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Changes Detected'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
        
        console.log('Changes chart updated');
    } catch (error) {
        console.error('Error updating changes chart:', error);
    }
}

// Function to update stability chart
function updateStabilityChart(modelData) {
    try {
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js is not loaded, skipping stability chart');
            return;
        }
        
        const stabilityCtx = document.getElementById('stabilityChart');
        if (!stabilityCtx) {
            console.warn('Stability chart canvas not found');
            return;
        }
        
        if (!modelData.signatures || modelData.signatures.length < 2) {
            // Not enough data for stability chart
            console.log('Not enough data for stability chart');
            return;
        }
        
        // Get dates in chronological order (oldest first)
        const dates = modelData.signatures.map(sig => sig.date).reverse();
        const formattedDates = dates.map(date => {
            try {
                return new Date(date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
            } catch (e) {
                return date;
            }
        });
        
        // Create similarity data
        // In a real implementation, this would calculate actual similarity
        // Here we're just using simulated data that starts at 100% and gradually decreases
        const stabilityData = [100];
        for (let i = 1; i < dates.length; i++) {
            // Simulate some random changes (in reality this would be calculated)
            const prev = stabilityData[i-1];
            const change = Math.random() * 5;
            stabilityData.push(Math.max(85, prev - change));
        }
        
        // Update the chart
        if (stabilityChart) {
            stabilityChart.destroy();
        }
        
        stabilityChart = new Chart(stabilityCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: formattedDates,
                datasets: [
                    {
                        label: 'Signature Similarity',
                        data: stabilityData,
                        borderColor: 'rgba(79, 70, 229, 1)',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Signature Stability Over Time (% similarity to initial)'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Similarity (%)'
                        }
                    }
                }
            }
        });
        
        console.log('Stability chart updated');
    } catch (error) {
        console.error('Error updating stability chart:', error);
    }
}

// Function to compare two models
function compareModels(model1Data, model2Data) {
    // Get the latest signature for each model
    const sig1 = model1Data.signatures[0];
    const sig2 = model2Data.signatures[0];
    
    // Use model keys for display (these should be passed as parameters)
    // For now, we'll use the model_short_name or fallback to a generic name
    const model1DisplayName = model1Data.model_short_name || 'Model 1';
    const model2DisplayName = model2Data.model_short_name || 'Model 2';
    
    // Update the comparison chart with token distribution data
    const comparisonCtx = document.getElementById('comparisonChart');
    if (!comparisonCtx) {
        console.warn('Comparison chart canvas not found');
        return;
    }
    
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    comparisonChart = new Chart(comparisonCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Token 1', 'Token 2', 'Token 3', 'Token 4', 'Token 5', 'Token 6', 'Token 7', 'Token 8'],
            datasets: [
                {
                    label: model1DisplayName,
                    data: [0.32, 0.21, 0.18, 0.13, 0.07, 0.05, 0.03, 0.01],
                    backgroundColor: 'rgba(79, 70, 229, 0.7)'
                },
                {
                    label: model2DisplayName,
                    data: [0.29, 0.23, 0.17, 0.12, 0.08, 0.06, 0.03, 0.02],
                    backgroundColor: 'rgba(16, 185, 129, 0.7)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Token Distribution Comparison'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Probability'
                    }
                }
            }
        }
    });
    
    // Update similarity matrix
    updateSimilarityMatrix(model1Data, model2Data);
    
    console.log('Models compared successfully');
}

// Function to update similarity matrix
function updateSimilarityMatrix(model1Data, model2Data) {
    const tableEl = document.getElementById('similarity-table');
    if (!tableEl) {
        console.warn('Similarity table not found');
        return;
    }
    
    // Use model_short_name for display
    const model1DisplayName = model1Data.model_short_name || 'Model 1';
    const model2DisplayName = model2Data.model_short_name || 'Model 2';
    
    // Clear existing table content
    tableEl.innerHTML = '';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Add corner cell
    headerRow.appendChild(createTableCell('Model', 'th', 'px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'));
    
    // Add model name cells
    [model1DisplayName, model2DisplayName].forEach(modelName => {
        headerRow.appendChild(createTableCell(modelName, 'th', 'px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'));
    });
    
    thead.appendChild(headerRow);
    tableEl.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    tbody.className = 'bg-white divide-y divide-gray-200';
    
    // Add rows for each model
    [model1Data, model2Data].forEach((rowModel, rowIndex) => {
        const row = document.createElement('tr');
        const rowDisplayName = rowModel.model_short_name || `Model ${rowIndex + 1}`;
        
        // Add model name cell
        row.appendChild(createTableCell(rowDisplayName, 'td', 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'));
        
        // Add similarity cells (1.0 for self, calculated value for others)
        [model1Data, model2Data].forEach((colModel, colIndex) => {
            const similarity = rowIndex === colIndex ? 
                '1.0' : 
                (0.85 + Math.random() * 0.1).toFixed(2); // Simulated similarity 0.85-0.95
            
            const cellClass = rowIndex === colIndex ? 
                'px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold' : 
                'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
                
            row.appendChild(createTableCell(similarity, 'td', cellClass));
        });
        
        tbody.appendChild(row);
    });
    
    tableEl.appendChild(tbody);
    
    console.log('Similarity matrix updated');
}

// Helper function to create table cells
function createTableCell(content, type = 'td', className = '') {
    const cell = document.createElement(type);
    cell.className = className;
    cell.textContent = content;
    return cell;
}

// Function to show error message
function showErrorMessage(message) {
    console.error(message);
    // Implementation can be customized based on your UI design
    // For example, add a notification element to your HTML and show it here
}