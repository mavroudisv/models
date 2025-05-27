// This file contains functions for viewing detailed information about individual signatures

// Function to hide loading overlay
function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
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
    showLoadingOverlay();
    
    try {
        // Wait for Chart.js to load
        await waitForChartJS();
        
        // Get signature file path from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const signatureFile = urlParams.get('file');
        
        if (!signatureFile) {
            throw new Error('No signature file specified');
        }
        
        console.log('Loading signature file:', signatureFile);
        // Fetch the signature data using the fetchSignatureFile function
        const signatureData = await fetchSignatureFile(signatureFile);
        console.log('Signature data loaded:', signatureData);
        
        // Display the signature data
        displaySignatureDetails(signatureData);
        
    } catch (error) {
        console.error('Error loading signature:', error);
        showError(`Error loading signature: ${error.message}`);
    } finally {
        hideLoadingOverlay();
    }
}

// Function to display signature details
function displaySignatureDetails(signatureData) {
    try {
        // Extract relevant information
        const { metadata, configuration, path_analysis, distribution_results, api_parameters } = signatureData;
        
        // Update page title
        document.title = `StampR - ${metadata.model_name} Signature Details`;
        
        // Set header information
        document.getElementById('model-name').textContent = metadata.model_name;
        
        // Add provider name if it exists (check both metadata and api_parameters)
        const provider = metadata.provider || (api_parameters && api_parameters.provider);
        if (provider) {
            const providerElement = document.createElement('div');
            providerElement.className = 'provider-tag';
            providerElement.textContent = `Provider: ${provider}`;
            document.getElementById('model-name').parentNode.appendChild(providerElement);
        }
        
        // Add creator if it exists
        const creator = metadata.creator || (api_parameters && api_parameters.creator);
        if (creator) {
            const creatorElement = document.createElement('div');
            creatorElement.className = 'provider-tag';
            creatorElement.textContent = `Developer: ${creator}`;
            document.getElementById('model-name').parentNode.appendChild(creatorElement);
        }
        
        // Add service provider if it exists
        const serviceProvider = metadata.service_provider || (api_parameters && api_parameters.service_provider);
        if (serviceProvider) {
            const serviceProviderElement = document.createElement('div');
            serviceProviderElement.className = 'provider-tag';
            serviceProviderElement.textContent = `Provider: ${serviceProvider}`;
            document.getElementById('model-name').parentNode.appendChild(serviceProviderElement);
        }
        
        document.getElementById('signature-date').textContent = formatDate(metadata.date);
        
        // Display truncated hash at the top
        const hash = metadata.distribution_hash;
        const truncatedHash = hash.substring(0, 8) + '...' + hash.substring(hash.length - 8);
        document.getElementById('signature-hash').textContent = truncatedHash;
        
        // Add copy functionality for the full hash
        const copyButton = document.getElementById('copy-hash');
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
        
        // Set metadata section
        const metadataList = document.getElementById('metadata-list');
        metadataList.innerHTML = '';
        
        Object.entries(metadata).forEach(([key, value]) => {
            if (key === 'distribution_hash') {
                // Format the full hash with line breaks every 32 characters
                const formattedHash = value.match(/.{1,32}/g).join('\n');
                metadataList.appendChild(createListItem(key, formattedHash));
            } else {
                metadataList.appendChild(createListItem(key, value));
            }
        });
        
        // Set configuration section
        const configList = document.getElementById('config-list');
        configList.innerHTML = '';
        
        Object.entries(configuration).forEach(([key, value]) => {
            configList.appendChild(createListItem(key, value));
        });
        
        // Set path analysis
        const pathTokens = path_analysis.path_tokens.join(' → ');
        document.getElementById('path-tokens').textContent = pathTokens;
        
        // Create distribution chart
        createDistributionChart(distribution_results);
        
        // Fill token table
        createTokenTable(distribution_results);
    } catch (error) {
        console.error('Error displaying signature details:', error);
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
        const ctx = document.getElementById('distribution-chart').getContext('2d');
        
        // Check if chart already exists and destroy it
        if (window.distributionChart) {
            window.distributionChart.destroy();
        }
        
        window.distributionChart = new Chart(ctx, {
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
    const { tokens, total_tokens_collected, unique_tokens_collected } = distributionResults;
    
    // Update summary statistics
    document.getElementById('total-tokens').textContent = total_tokens_collected;
    document.getElementById('unique-tokens').textContent = unique_tokens_collected;
    
    // Convert tokens object to array and sort by probability
    const tokenArray = Object.values(tokens).sort((a, b) => b.probability - a.probability);
    
    // Get table body
    const tableBody = document.getElementById('token-table-body');
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
    
    if (key === 'distribution_hash') {
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
document.addEventListener('DOMContentLoaded', initSignatureDetailsPage);