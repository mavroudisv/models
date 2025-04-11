// This file contains functions for fetching and processing signature data from the server
// It's separated from the main app.js for better organization

// Make functions globally available
window.fetchSignatureFile = async function(filePath) {
    try {
        console.log('Fetching signature file:', filePath);
        const response = await fetch(filePath, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Successfully loaded signature file:', filePath);
        return data;
    } catch (error) {
        console.error(`Error fetching signature file ${filePath}:`, error);
        throw error;
    }
};

// Function to fetch all signatures index
async function fetchSignaturesIndex() {
    try {
        console.log('Fetching signatures.json');
        const response = await fetch('signatures.json', {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Successfully loaded signatures.json');
        return data;
    } catch (error) {
        console.error('Error fetching signatures index:', error);
        // Return a default structure if fetch fails
        return {
            metadata: {
                last_updated: new Date().toISOString()
            },
            models: {}
        };
    }
}

// Function to extract token distribution from a signature file
function extractTokenDistribution(signatureData) {
    try {
        const { distribution_results } = signatureData;
        const { tokens } = distribution_results;
        
        // Convert tokens object to array for easier processing
        const tokenArray = Object.values(tokens).map(token => ({
            token_string: token.token_string,
            token_id: token.token_id,
            count: token.count,
            probability: token.probability
        }));
        
        // Sort by probability (descending)
        tokenArray.sort((a, b) => b.probability - a.probability);
        
        return tokenArray;
    } catch (error) {
        console.error('Error extracting token distribution:', error);
        return [];
    }
}

// Function to calculate similarity between two token distributions
function calculateDistributionSimilarity(distribution1, distribution2) {
    // Create maps for fast lookup
    const map1 = new Map(distribution1.map(token => [token.token_string, token.probability]));
    const map2 = new Map(distribution2.map(token => [token.token_string, token.probability]));
    
    // Get all unique tokens
    const allTokens = new Set([...map1.keys(), ...map2.keys()]);
    
    // Calculate similarity metrics
    let totalOverlap = 0;
    let jsDivergence = 0;
    
    for (const token of allTokens) {
        const prob1 = map1.get(token) || 0;
        const prob2 = map2.get(token) || 0;
        
        // Minimum overlap
        totalOverlap += Math.min(prob1, prob2);
        
        // Jensen-Shannon divergence (simplified)
        if (prob1 > 0 && prob2 > 0) {
            const mean = (prob1 + prob2) / 2;
            jsDivergence += (
                (prob1 * Math.log2(prob1 / mean)) / 2 +
                (prob2 * Math.log2(prob2 / mean)) / 2
            );
        } else if (prob1 > 0) {
            jsDivergence += prob1 / 2;
        } else if (prob2 > 0) {
            jsDivergence += prob2 / 2;
        }
    }
    
    // Convert divergence to similarity (1 is identical, 0 is completely different)
    const jsSimilarity = Math.max(0, 1 - jsDivergence);
    
    // Return combined metrics (can be tuned based on preference)
    return {
        overlap: totalOverlap,
        jsSimilarity: jsSimilarity,
        // Combined score - weighted average of both metrics
        combined: (totalOverlap * 0.7) + (jsSimilarity * 0.3)
    };
}

// Function to process signature data for visualization
async function processSignatureForChart(signatureFile) {
    try {
        const signatureData = await fetchSignatureFile(signatureFile);
        const tokenDistribution = extractTokenDistribution(signatureData);
        
        // Format data for Chart.js
        const labels = tokenDistribution.slice(0, 10).map(token => token.token_string);
        const data = tokenDistribution.slice(0, 10).map(token => token.probability);
        
        return {
            metadata: signatureData.metadata,
            configuration: signatureData.configuration,
            labels: labels,
            data: data,
            rawDistribution: tokenDistribution
        };
    } catch (error) {
        console.error(`Error processing signature file ${signatureFile}:`, error);
        throw error;
    }
}

// Function to compare two signature files and calculate differences
async function compareSignatureFiles(file1, file2) {
    try {
        const [signature1, signature2] = await Promise.all([
            fetchSignatureFile(file1),
            fetchSignatureFile(file2)
        ]);
        
        const distribution1 = extractTokenDistribution(signature1);
        const distribution2 = extractTokenDistribution(signature2);
        
        // Calculate similarity metrics
        const similarity = calculateDistributionSimilarity(distribution1, distribution2);
        
        // Get common top tokens for visualization
        const allTokenStrings = new Set([
            ...distribution1.slice(0, 10).map(t => t.token_string),
            ...distribution2.slice(0, 10).map(t => t.token_string)
        ]);
        
        // Create maps for fast lookup
        const map1 = new Map(distribution1.map(token => [token.token_string, token.probability]));
        const map2 = new Map(distribution2.map(token => [token.token_string, token.probability]));
        
        // Convert to ordered arrays for chart
        const labels = Array.from(allTokenStrings);
        const dataset1 = labels.map(token => map1.get(token) || 0);
        const dataset2 = labels.map(token => map2.get(token) || 0);
        
        return {
            metadata1: signature1.metadata,
            metadata2: signature2.metadata,
            similarity: similarity,
            labels: labels,
            datasets: [
                {
                    label: signature1.metadata.model_name,
                    data: dataset1,
                    backgroundColor: 'rgba(79, 70, 229, 0.7)'
                },
                {
                    label: signature2.metadata.model_name,
                    data: dataset2,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)'
                }
            ]
        };
    } catch (error) {
        console.error('Error comparing signature files:', error);
        throw error;
    }
}

// Function to calculate stability over time for a model
async function calculateModelStability(signatureFiles) {
    try {
        if (signatureFiles.length < 2) {
            return null; // Not enough data
        }
        
        // Load all signature files
        const signatures = await Promise.all(
            signatureFiles.map(file => fetchSignatureFile(file.file))
        );
        
        // Extract distributions
        const distributions = signatures.map(sig => extractTokenDistribution(sig));
        
        // Calculate similarity over time (comparing each to the first/baseline)
        const baselineDistribution = distributions[distributions.length - 1]; // Oldest signature
        
        const stabilityData = distributions.map(dist => {
            const similarity = calculateDistributionSimilarity(dist, baselineDistribution);
            return similarity.combined * 100; // Convert to percentage
        });
        
        // Format dates for chart
        const dates = signatureFiles.map(file => {
            try {
                return new Date(file.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
            } catch (e) {
                return file.date;
            }
        });
        
        return {
            labels: dates.reverse(), // Reverse to show oldest first
            data: stabilityData.reverse() // Reverse to match dates
        };
    } catch (error) {
        console.error('Error calculating model stability:', error);
        throw error;
    }
}