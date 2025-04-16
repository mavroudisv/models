import json
import os
import subprocess
from datetime import datetime
from pathlib import Path
import sys
import argparse

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--timeout', type=int, default=300, help='Timeout in seconds for each model')
    return parser.parse_args()

def log(message):
    """Log message to both stdout and a file"""
    print(message, flush=True)
    with open('generation.log', 'a') as f:
        f.write(f"{datetime.now().isoformat()} - {message}\n")

def load_models():
    """Load the list of models from models.json"""
    log("Current working directory: " + os.getcwd())
    log("Contents of current directory: " + str(os.listdir('.')))
    try:
        with open('models.json', 'r') as f:
            data = json.load(f)
            log("Successfully loaded models.json")
            log("Models to process: " + str(data['models']))
            return data['models']
    except Exception as e:
        log(f"Error loading models.json: {str(e)}")
        raise

def generate_signature(model_name, timeout):
    """Generate a signature for a specific model"""
    try:
        log(f"\nStarting signature generation for {model_name}...")
        
        # Create signatures directory if it doesn't exist
        os.makedirs('../signatures', exist_ok=True)
        log("Created/verified signatures directory")
        
        # Create model directory if it doesn't exist
        model_dir = f'../signatures/{model_name}'
        os.makedirs(model_dir, exist_ok=True)
        log(f"Created/verified model directory: {model_dir}")
        
        # Generate signature using the stampr_ai-collector
        log(f"Running collector for {model_name}...")
        log("Current Python path: " + os.environ.get('PYTHONPATH', ''))
        
        cmd = ['python', '-m', 'stampr_ai_collector', '--model', model_name, '--output-dir', model_dir]
            
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        
        log(f"Collector completed with return code: {result.returncode}")
        if result.returncode != 0:
            log(f"Error generating signature for {model_name}:")
            log(result.stderr)
            return False
            
        # The collector should output the path to the generated signature
        signature_path = result.stdout.strip()
        if not signature_path:
            log(f"No signature path returned for {model_name}")
            return False
            
        log(f"Generated signature at: {signature_path}")
        
        # Update signatures.json
        update_signatures_index(model_name, signature_path)
        log(f"Updated signatures index for {model_name}")
        
        return True
        
    except subprocess.TimeoutExpired:
        log(f"Timeout after {timeout} seconds while generating signature for {model_name}")
        return False
    except Exception as e:
        log(f"Error generating signature for {model_name}: {str(e)}")
        return False

def update_signatures_index(model_name, signature_path):
    """Update the signatures.json index file"""
    try:
        log(f"Updating signatures index for {model_name}...")
        # Load existing index
        index_path = '../signatures.json'
        if os.path.exists(index_path):
            with open(index_path, 'r') as f:
                index = json.load(f)
        else:
            index = {
                'metadata': {
                    'last_updated': datetime.now().isoformat()
                },
                'models': {}
            }
        
        # Ensure models is a dictionary
        if 'models' not in index:
            index['models'] = {}
            
        # Ensure the model's entry is a list
        if model_name not in index['models']:
            index['models'][model_name] = []
        elif not isinstance(index['models'][model_name], list):
            index['models'][model_name] = []
            
        # Add new signature
        index['models'][model_name].append({
            'file': signature_path,
            'date': datetime.now().isoformat()
        })
        
        # Sort signatures by date (newest first)
        index['models'][model_name].sort(
            key=lambda x: x['date'],
            reverse=True
        )
        
        # Update last_updated timestamp
        index['metadata']['last_updated'] = datetime.now().isoformat()
        
        # Save the index
        with open(index_path, 'w') as f:
            json.dump(index, f, indent=2)
        log("Signatures index updated successfully")
            
    except Exception as e:
        log(f"Error updating signatures index: {str(e)}")

def main():
    """Main function to generate signatures for all models"""
    try:
        # Parse command line arguments
        args = parse_args()
        
        # Clear any existing log file
        if os.path.exists('generation.log'):
            os.remove('generation.log')
            
        log("Starting main function...")
        log(f"Timeout set to {args.timeout} seconds")
        
        # Load models to test
        models = load_models()
        log(f"Generating signatures for models: {', '.join(models)}")
        
        # Generate signatures for each model
        for model in models:
            log(f"\nProcessing model: {model}")
            success = generate_signature(model, args.timeout)
            if not success:
                log(f"Failed to generate signature for {model}")
            else:
                log(f"Successfully generated signature for {model}")
                
    except Exception as e:
        log(f"Error in main function: {str(e)}")

if __name__ == "__main__":
    main() 