// This file contains functions for viewing detailed information about individual signatures

// Add immediate logging to verify console is working
// console.log('=== SIGNATURE DETAILS SCRIPT LOADED ===');
// console.log('Script Version: 2.0 - Updated for hash field compatibility');
// console.log('Timestamp:', new Date().toISOString());
// console.log('User agent:', navigator.userAgent);

// // Force console to be visible and add an alert to confirm script loading
// if (typeof window !== 'undefined') {
//     console.log('Window object available, script running in browser');
//     // Add a temporary alert to confirm the updated script is loading
//     setTimeout(() => {
//         console.log('=== SCRIPT FULLY LOADED AND READY ===');
//     }, 100);
// }

// Global error handler to catch any uncaught errors
window.addEventListener('error', function(event) {
    console.error('=== GLOBAL ERROR CAUGHT ===');
    console.error('Error:', event.error);
    console.error('Message:', event.message);
    console.error('Filename:', event.filename);
    console.error('Line:', event.lineno);
    console.error('Column:', event.colno);
    console.error('Stack:', event.error?.stack);
    console.error('Event:', event);
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(event) {
    console.error('=== UNHANDLED PROMISE REJECTION ===');
    console.error('Reason:', event.reason);
    console.error('Promise:', event.promise);
});

// Function to hide loading overlay
function hideLoadingOverlay() {
    console.log('hideLoadingOverlay called');
    const overlay = document.getElementById('loading-overlay');
    console.log('Loading overlay element:', overlay);
    if (overlay) {
        overlay.style.display = 'none';
        console.log('Loading overlay hidden');
    } else {
        console.warn('Loading overlay element not found');
    }
}

// Function to show loading overlay
function showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

// Function to check if Chart.js is loaded
function waitForChartJS() {
    return new Promise((resolve, reject) => {
        if (window.chartLoadError) {
            reject(new Error('Chart.js failed to load from CDN'));
            return;
        }

        let attempts = 0;
        const maxAttempts = 50; // 5 seconds total
        
        const checkChart = () => {
            if (typeof Chart !== 'undefined') {
                resolve();
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkChart, 100);
            } else {
                reject(new Error('Chart.js failed to load'));
            }
        };
        
        checkChart();
    });
}

// Function to initialize the details page
async function initSignatureDetailsPage() {
    console.log('=== Starting initSignatureDetailsPage ===');
    console.log('Document ready state:', document.readyState);
    console.log('Current URL:', window.location.href);
    
    showLoadingOverlay();
    
    try {
        console.log('Waiting for Chart.js to load...');
        // Wait for Chart.js to load
        await waitForChartJS();
        console.log('Chart.js loaded successfully');
        
        // Get signature file path from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const signatureFile = urlParams.get('file');
        console.log('URL parameters:', Object.fromEntries(urlParams.entries()));
        console.log('Signature file parameter:', signatureFile);
        
        if (!signatureFile) {
            throw new Error('No signature file specified in URL parameters');
        }
        
        // First, load the signatures index to get model information
        console.log('Loading signatures index...');
        const signaturesIndex = await fetchSignaturesIndex();
        console.log('Signatures index loaded successfully');
        
        // Find which model this signature belongs to
        let modelKey = null;
        let modelData = null;
        
        for (const [key, data] of Object.entries(signaturesIndex.models)) {
            const matchingSignature = data.signatures.find(sig => sig.file === signatureFile);
            if (matchingSignature) {
                modelKey = key;
                modelData = data;
                break;
            }
        }
        
        if (!modelKey || !modelData) {
            throw new Error(`Could not find model information for signature file: ${signatureFile}`);
        }
        
        console.log('Found model:', modelKey, modelData);
        
        // Now load the individual signature file
        console.log('Loading signature file:', signatureFile);
        const signatureData = await fetchSignatureFile(signatureFile);
        console.log('Signature data loaded successfully:', signatureData);
        
        // Combine the model information with signature data
        const combinedData = {
            ...signatureData,
            modelKey: modelKey,
            modelInfo: modelData
        };
        
        // Check if DOM is ready
        console.log('Checking DOM readiness...');
        console.log('Document body exists:', !!document.body);
        console.log('Document head exists:', !!document.head);
        console.log('Signature details container exists:', !!document.getElementById('signature-details'));
        
        // Display the signature data
        console.log('Calling displaySignatureDetails...');
        displaySignatureDetails(combinedData);
        
    } catch (error) {
        console.error('Error in initSignatureDetailsPage:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            fileName: error.fileName,
            lineNumber: error.lineNumber,
            columnNumber: error.columnNumber
        });
        showError(`Error loading signature: ${error.message}`);
    } finally {
        console.log('Hiding loading overlay...');
        hideLoadingOverlay();
        console.log('=== initSignatureDetailsPage completed ===');
    }
}

// Function to display signature details
function displaySignatureDetails(combinedData) {
    try {
        console.log('Starting displaySignatureDetails with data:', combinedData);
        
        // Validate input data
        if (!combinedData) {
            throw new Error('No signature data provided');
        }
        
        // Extract relevant information with validation
        const { metadata, configuration, path_analysis, distribution_results, api_parameters, modelKey, modelInfo } = combinedData;
        
        if (!metadata) {
            throw new Error('No metadata found in signature data');
        }
        
        if (!modelKey || !modelInfo) {
            throw new Error('No model information found');
        }
        
        console.log('Metadata:', metadata);
        console.log('Configuration:', configuration);
        console.log('Path analysis:', path_analysis);
        console.log('Distribution results:', distribution_results);
        console.log('API parameters:', api_parameters);
        console.log('Model key:', modelKey);
        console.log('Model info:', modelInfo);
        
        // Use the model_short_name as the display name (e.g., "Llama4_17b")
        const displayName = modelInfo.model_short_name || modelKey;
        
        // Update page title
        document.title = `StampR - ${displayName} Signature Details`;
        console.log('Updated page title');
        
        // Set header information with detailed logging
        console.log('Looking for element with id "model-name"');
        const modelNameEl = document.getElementById('model-name');
        console.log('model-name element:', modelNameEl);
        
        if (!modelNameEl) {
            // Log all elements with IDs for debugging
            const allElementsWithIds = document.querySelectorAll('[id]');
            console.log('All elements with IDs found on page:', Array.from(allElementsWithIds).map(el => ({
                id: el.id,
                tagName: el.tagName,
                className: el.className
            })));
            throw new Error('Element with id "model-name" not found. Check if the HTML page loaded correctly.');
        }
        
        console.log('Setting model name to:', displayName);
        modelNameEl.textContent = displayName;
        console.log('Model name set successfully');
        
        // Clear any existing provider tags to prevent duplicates
        const existingTags = modelNameEl.parentNode.querySelectorAll('.provider-tag');
        existingTags.forEach(tag => tag.remove());
        console.log('Cleared existing provider tags');
        
        // Add creator and service provider information from model info
        if (modelInfo.creator) {
            const creatorElement = document.createElement('div');
            creatorElement.className = 'provider-tag';
            creatorElement.textContent = `Developer: ${modelInfo.creator}`;
            modelNameEl.parentNode.appendChild(creatorElement);
            console.log('Creator element added:', modelInfo.creator);
        }
        
        if (modelInfo.service_provider && modelInfo.service_provider !== modelInfo.creator) {
            const serviceProviderElement = document.createElement('div');
            serviceProviderElement.className = 'provider-tag';
            serviceProviderElement.textContent = `Provider: ${modelInfo.service_provider}`;
            modelNameEl.parentNode.appendChild(serviceProviderElement);
            console.log('Service provider element added:', modelInfo.service_provider);
        }
        
        console.log('Looking for element with id "signature-date"');
        const signatureDateEl = document.getElementById('signature-date');
        console.log('signature-date element:', signatureDateEl);
        
        if (!signatureDateEl) {
            throw new Error('Element with id "signature-date" not found. Check if the HTML page loaded correctly.');
        }
        
        if (!metadata.date) {
            console.warn('No date found in metadata');
            signatureDateEl.textContent = 'Date not available';
        } else {
            console.log('Setting signature date to:', metadata.date);
            signatureDateEl.textContent = formatDate(metadata.date);
            console.log('Signature date set successfully');
        }
        
        // Display truncated hash at the top
        const hash = metadata.distribution_hash || metadata.signature_hash;
        if (!hash) {
            console.warn('No distribution_hash or signature_hash found in metadata');
            console.log('Available metadata keys:', Object.keys(metadata));
            throw new Error('No hash found in metadata (checked both distribution_hash and signature_hash)');
        }
        
        const truncatedHash = hash.substring(0, 8) + '...' + hash.substring(hash.length - 8);
        
        console.log('Looking for element with id "signature-hash"');
        const signatureHashEl = document.getElementById('signature-hash');
        console.log('signature-hash element:', signatureHashEl);
        
        if (!signatureHashEl) {
            throw new Error('Element with id "signature-hash" not found. Check if the HTML page loaded correctly.');
        }
        
        console.log('Setting signature hash to:', truncatedHash);
        signatureHashEl.textContent = truncatedHash;
        console.log('Signature hash set successfully');
        
        // Add copy functionality for the full hash
        const copyButton = document.getElementById('copy-hash');
        console.log('copy-hash button:', copyButton);
        if (copyButton) {
            copyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(hash).then(() => {
                    // Show a temporary tooltip
                    const tooltip = document.createElement('div');
                    tooltip.className = 'absolute bg-gray-800 text-white text-xs rounded py-1 px-2';
                    tooltip.textContent = 'Copied!';
                    tooltip.style.top = '-25px';
                    tooltip.style.left = '50%';
                    tooltip.style.transform = 'translateX(-50%)';
                    copyButton.appendChild(tooltip);
                    
                    setTimeout(() => {
                        tooltip.remove();
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy hash:', err);
                });
            });
            console.log('Copy button event listener added');
        }
        
        // Set metadata section
        console.log('Looking for element with id "metadata-list"');
        const metadataList = document.getElementById('metadata-list');
        console.log('metadata-list element:', metadataList);
        
        if (metadataList) {
            metadataList.innerHTML = '';
            
            // First add model information from the index
            metadataList.appendChild(createListItem('model_key', modelKey));
            if (modelInfo.model_name) {
                metadataList.appendChild(createListItem('full_model_name', modelInfo.model_name));
            }
            if (modelInfo.model_short_name) {
                metadataList.appendChild(createListItem('model_short_name', modelInfo.model_short_name));
            }
            if (modelInfo.creator) {
                metadataList.appendChild(createListItem('creator', modelInfo.creator));
            }
            if (modelInfo.service_provider) {
                metadataList.appendChild(createListItem('service_provider', modelInfo.service_provider));
            }
            
            // Then add signature metadata
            Object.entries(metadata).forEach(([key, value]) => {
                if (key === 'distribution_hash' || key === 'signature_hash') {
                    // Format the full hash with line breaks every 32 characters
                    const formattedHash = value.match(/.{1,32}/g).join('\n');
                    metadataList.appendChild(createListItem(key, formattedHash));
                } else {
                    metadataList.appendChild(createListItem(key, value));
                }
            });
            console.log('Metadata list populated');
        } else {
            console.warn('metadata-list element not found');
        }
        
        // Set configuration section
        console.log('Looking for element with id "config-list"');
        const configList = document.getElementById('config-list');
        console.log('config-list element:', configList);
        
        if (configList && configuration) {
            configList.innerHTML = '';
            
            Object.entries(configuration).forEach(([key, value]) => {
                configList.appendChild(createListItem(key, value));
            });
            console.log('Configuration list populated');
        } else {
            if (!configList) console.warn('config-list element not found');
            if (!configuration) console.warn('No configuration data available');
        }
        
        // Set path analysis
        console.log('Looking for element with id "path-tokens"');
        const pathTokensEl = document.getElementById('path-tokens');
        console.log('path-tokens element:', pathTokensEl);
        
        if (pathTokensEl && path_analysis && path_analysis.path_tokens) {
            const pathTokens = path_analysis.path_tokens.join(' → ');
            pathTokensEl.textContent = pathTokens;
            console.log('Path tokens set successfully');
        } else {
            if (!pathTokensEl) console.warn('path-tokens element not found');
            if (!path_analysis) console.warn('No path analysis data available');
            if (!path_analysis?.path_tokens) console.warn('No path tokens in path analysis data');
        }
        
        // Create distribution chart
        console.log('Creating distribution chart...');
        createDistributionChart(distribution_results);
        
        // Fill token table
        console.log('Creating token table...');
        createTokenTable(distribution_results);
        
        console.log('displaySignatureDetails completed successfully');
        
    } catch (error) {
        console.error('Error in displaySignatureDetails:', error);
        console.error('Error stack:', error.stack);
        console.error('Current document state:', {
            readyState: document.readyState,
            title: document.title,
            body: document.body ? 'exists' : 'missing',
            head: document.head ? 'exists' : 'missing'
        });
        showError(`Error displaying signature details: ${error.message}`);
    }
}

// Function to create distribution chart
function createDistributionChart(distributionResults) {
    try {
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            // Show a fallback display
            const chartContainer = document.getElementById('distribution-chart');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
                        <p class="font-medium">Chart display unavailable</p>
                        <p class="text-sm mt-1">Token distribution data is still available in the table below.</p>
                    </div>
                `;
            }
            return;
        }
        
        const { tokens } = distributionResults;
        
        // Convert tokens object to array and sort by probability
        const tokenArray = Object.values(tokens)
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 10); // Only show top 10 tokens
        
        const labels = tokenArray.map(token => token.token_string);
        const data = tokenArray.map(token => token.probability);
        
        // Create the chart
        const ctx = document.getElementById('distribution-chart');
        if (!ctx) {
            console.warn('Distribution chart canvas not found');
            return;
        }
        
        const chartContext = ctx.getContext('2d');
        
        // Check if chart already exists and destroy it
        if (window.distributionChart) {
            window.distributionChart.destroy();
        }
        
        window.distributionChart = new Chart(chartContext, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Token Probability',
                    data: data,
                    backgroundColor: 'rgba(79, 70, 229, 0.7)',
                    borderColor: 'rgba(79, 70, 229, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Token Distribution'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                return `Probability: ${value.toFixed(4)}`;
                            }
                        }
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
    } catch (error) {
        console.error('Error creating distribution chart:', error);
        // Show a fallback display
        const chartContainer = document.getElementById('distribution-chart');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
                    <p class="font-medium">Chart display unavailable</p>
                    <p class="text-sm mt-1">Token distribution data is still available in the table below.</p>
                </div>
            `;
        }
    }
}

// Function to create token table
function createTokenTable(distributionResults) {
    if (!distributionResults) {
        console.warn('No distribution results provided to createTokenTable');
        return;
    }
    
    const { tokens, total_tokens_collected, unique_tokens_collected } = distributionResults;
    
    // Update summary statistics
    const totalTokensEl = document.getElementById('total-tokens');
    if (totalTokensEl) {
        totalTokensEl.textContent = total_tokens_collected;
    }
    
    const uniqueTokensEl = document.getElementById('unique-tokens');
    if (uniqueTokensEl) {
        uniqueTokensEl.textContent = unique_tokens_collected;
    }
    
    // Convert tokens object to array and sort by probability
    if (!tokens) {
        console.warn('No tokens data available');
        return;
    }
    
    const tokenArray = Object.values(tokens).sort((a, b) => b.probability - a.probability);
    
    // Get table body
    const tableBody = document.getElementById('token-table-body');
    if (!tableBody) {
        console.warn('Token table body element not found');
        return;
    }
    
    tableBody.innerHTML = '';
    
    // Add rows for each token
    tokenArray.forEach((token, index) => {
        const row = document.createElement('tr');
        
        // Add rank
        const rankCell = document.createElement('td');
        rankCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
        rankCell.textContent = index + 1;
        row.appendChild(rankCell);
        
        // Add token string
        const tokenCell = document.createElement('td');
        tokenCell.className = 'px-6 py-4 whitespace-nowrap text-sm font-mono';
        tokenCell.textContent = token.token_string;
        row.appendChild(tokenCell);
        
        // Add token ID
        const idCell = document.createElement('td');
        idCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
        idCell.textContent = token.token_id;
        row.appendChild(idCell);
        
        // Add count
        const countCell = document.createElement('td');
        countCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
        countCell.textContent = token.count;
        row.appendChild(countCell);
        
        // Add probability
        const probCell = document.createElement('td');
        probCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
        probCell.textContent = token.probability.toFixed(6);
        row.appendChild(probCell);
        
        // Add row to table
        tableBody.appendChild(row);
    });
}

// Helper function to create a list item for metadata and configuration
function createListItem(key, value) {
    const item = document.createElement('div');
    item.className = 'flex justify-between py-2 border-b border-gray-100';
    
    const keySpan = document.createElement('span');
    keySpan.className = 'text-gray-600';
    keySpan.textContent = formatKey(key);
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'text-gray-900 font-medium';
    
    if (key === 'distribution_hash' || key === 'signature_hash') {
        valueSpan.className += ' break-all whitespace-pre-wrap font-mono text-sm';
        // Format the hash with line breaks every 32 characters
        const formattedHash = value.match(/.{1,32}/g).join('\n');
        valueSpan.textContent = formattedHash;
    } else {
        valueSpan.textContent = formatValue(value);
    }
    
    item.appendChild(keySpan);
    item.appendChild(valueSpan);
    
    return item;
}

// Helper function to format a key for display
function formatKey(key) {
    return key.replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Helper function to format a value for display
function formatValue(value) {
    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }
    
    if (value === null || value === undefined) {
        return '-';
    }
    
    // Handle arrays (like messages)
    if (Array.isArray(value)) {
        // Special handling for messages array
        if (value.length > 0 && value[0].role && value[0].content) {
            return value.map((msg, index) => {
                const roleLabel = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : msg.role;
                return `[${index + 1}] ${roleLabel}: ${msg.content}`;
            }).join(' | ');
        }
        // General array handling
        return value.map(item => 
            typeof item === 'object' ? JSON.stringify(item) : String(item)
        ).join(', ');
    }
    
    // Handle objects
    if (typeof value === 'object') {
        // For response_format and similar simple objects
        if (Object.keys(value).length <= 3) {
            return Object.entries(value)
                .map(([key, val]) => `${key}: ${val}`)
                .join(', ');
        }
        // For complex objects, use JSON formatting
        return JSON.stringify(value);
    }
    
    return String(value);
}

// Helper function to format a date
function formatDate(dateString) {
    try {
        // Try to parse the date (handle different formats)
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            // If parsing fails, just return the original string
            return dateString;
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

// Function to show an error message
function showError(message) {
    const container = document.getElementById('signature-details');
    container.innerHTML = `
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong class="font-bold">Error!</strong>
            <span class="block sm:inline">${message}</span>
        </div>
    `;
}

// Initialize the page when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM CONTENT LOADED EVENT FIRED ===');
    
    // Immediate DOM check
    const requiredElements = [
        'model-name',
        'signature-date', 
        'signature-hash',
        'metadata-list',
        'config-list',
        'path-tokens',
        'total-tokens',
        'unique-tokens',
        'token-table-body',
        'distribution-chart'
    ];
    
    console.log('Checking for required DOM elements...');
    const missingElements = [];
    const foundElements = [];
    
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            foundElements.push(id);
        } else {
            missingElements.push(id);
        }
    });
    
    console.log('Found elements:', foundElements);
    console.log('Missing elements:', missingElements);
    
    if (missingElements.length > 0) {
        console.error('CRITICAL: Missing required DOM elements:', missingElements);
        console.log('Current page HTML structure check:');
        console.log('Document title:', document.title);
        console.log('Body exists:', !!document.body);
        console.log('All elements with IDs:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
    } else {
        console.log('✅ All required DOM elements found');
    }
    
    // Now call the original initialization
    initSignatureDetailsPage();
});