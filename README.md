# stampr AI - Model Signature Tracker

<div align="center">
  <img src="images/stampr.png" alt="stampr AI logo" width="200">
</div>

<!--[![GitHub Actions](https://github.com/mavroudisv/models/actions/workflows/generate-signatures.yml/badge.svg)](https://github.com/mavroudisv/models/actions/workflows/generate-signatures.yml)-->

> Live Site: [https://mavroudisv.github.io/models/](https://mavroudisv.github.io/models/)

stampr AI is a tool for tracking and analyzing AI model signatures. It helps you monitor model behavior, detect changes, and ensure consistency across different versions, deployments and providers.

## Components

### Public Website
The stampr AI website provides a comprehensive interface for:

- **Model Signature Visualization**: View current signatures for all monitored models
- **Historical Tracking**: Track how models change over time with detailed timelines
- **Change Detection**: Identify when and how models are updated or modified
- **Stability Monitoring**: Monitor model stability through signature consistency

### Verification Tool
The public `stampr-ai` pip package allows you to verify if a model matches its claimed identity:

```bash
pip install stampr-ai
```

Usage:
```python
from stampr_ai import verify_model

# Verify if a model matches its claimed identity
is_verified = verify_model(
    model_name="gpt-4o",
    api_key="your-api-key"
)

if is_verified:
    print("Model identity verified!")
else:
    print("Model identity could not be verified.")
```

## How It Works

1. **Signature Generation**: Our private collector generates unique signatures for AI models
2. **Change Detection**: The website tracks and displays model changes over time
3. **Public Verification**: The public pip tool compares a model's output against our verified signatures

## Features
- **Automated Signature Generation**: Automatically generates unique signatures for AI models
- **Change Detection**: Identifies when and how models change over time
- **Historical Tracking**: Maintains a complete history of model signatures
- **Visual Analytics**: Provides intuitive visualizations of model behavior and changes
- **Real-time Monitoring**: Updates signatures every 12 hours to track model stability

## Project Structure

```
models/
├── operations/          # Signature generation scripts
│   └── generate.py     # Main signature generation script
├── signatures/          # Generated model signatures
│   └── [model_name]/   # Individual model signature directories
├── signatures.json      # Signature index file
├── index.html          # Main web interface
├── css/                # Stylesheets
└── js/                 # JavaScript files
```

## Contributing

We welcome contributions! Here's how you can help:

1. **Report Issues**: Open an issue for bugs or feature requests
2. **Add Providers**: Help expand coverage by adding new providers
3. **Add Models**: Help expand coverage by adding new models
4. **Improve Tests**: Contribute new test cases or improve existing ones
5. **Documentation**: Help improve our documentation

## Contact

For questions or suggestions, please open an issue in the repository.
