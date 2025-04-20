import json
import os
import subprocess
from datetime import datetime
from pathlib import Path
import sys
import argparse
import yaml
import importlib.util
import stampr_ai_collector

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
        signatures_dir = os.path.join('..', 'signatures')
        os.makedirs(signatures_dir, exist_ok=True)
        log(f"Created/verified signatures directory: {signatures_dir}")
        
        # Create model directory if it doesn't exist
        model_dir = os.path.join(signatures_dir, model_name)
        os.makedirs(model_dir, exist_ok=True)
        log(f"Created/verified model directory: {model_dir}")
        
        # Get the collector package location
        collector_path = os.path.dirname(stampr_ai_collector.__file__)
        config_path = os.path.join(collector_path, 'configs', f'config_{model_name}.yaml')
        
        if not os.path.exists(config_path):
            log(f"Error: Config file not found at {config_path}")
            return False
            
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        log(f"Loaded config file: {config_path}")
        
        # Update output directory in config
        config['output_dir'] = model_dir
        
        # Generate signature using the stampr_ai-collector
        log(f"Running collector for {model_name}...")
        log("Current Python path: " + os.environ.get('PYTHONPATH', ''))
        
        # Log directory permissions and contents
        log(f"Output directory: {model_dir}")
        log(f"Directory exists: {os.path.exists(model_dir)}")
        log(f"Directory permissions: {oct(os.stat(model_dir).st_mode)[-3:]}")
        log(f"Directory contents: {os.listdir(model_dir)}")
        
        cmd = [
            'python', '-m', 'stampr_ai_collector',
            '--config', config_path,
            '--output-dir', model_dir
        ]
            
        # Run collector without capturing output
        result = subprocess.run(
            cmd,
            timeout=timeout
        )
        
        log(f"Collector completed with return code: {result.returncode}")
        if result.returncode != 0:
            log(f"Error generating signature for {model_name}")
            return False
            
        # Log directory contents after collector run
        log(f"Directory contents after collector run: {os.listdir(model_dir)}")
            
        # Look for the most recent JSON file in the output directory
        try:
            json_files = [f for f in os.listdir(model_dir) if f.endswith('.json')]
            log(f"Found JSON files: {json_files}")
            
            if json_files:
                # Sort by modification time, newest first
                json_files.sort(key=lambda x: os.path.getmtime(os.path.join(model_dir, x)), reverse=True)
                signature_path = os.path.join(model_dir, json_files[0])
                log(f"Using signature file: {signature_path}")
                log(f"File exists: {os.path.exists(signature_path)}")
                log(f"File permissions: {oct(os.stat(signature_path).st_mode)[-3:]}")
            else:
                log(f"No JSON files found in {model_dir}")
                return False
        except Exception as e:
            log(f"Error finding signature file: {str(e)}")
            return False
            
        # Make the path relative to the signatures directory
        signature_path = os.path.relpath(signature_path, '..')
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
                    'last_updated': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                },
                'models': {}
            }
        
        # Ensure models is a dictionary
        if 'models' not in index:
            index['models'] = {}
            
        # Get signature hash from filename
        signature_filename = os.path.basename(signature_path)
        hash_part = signature_filename.split('_')[0]
        
        # Load the signature file to get the full hash
        with open(os.path.join('..', signature_path), 'r') as f:
            signature_data = json.load(f)
            full_hash = signature_data['metadata']['distribution_hash']
        
        # Format the date from the filename
        date_part = signature_filename.split('_')[1].split('.')[0]
        
        # Create new signature entry
        new_signature = {
            'file': signature_path,
            'date': date_part,
            'hash': hash_part,
            'full_hash': full_hash
        }
        
        # Handle both old and new formats
        if model_name not in index['models']:
            # New format
            index['models'][model_name] = {
                'name': model_name,
                'signatures': [new_signature]
            }
        else:
            # Check if it's old format (list) or new format (object)
            if isinstance(index['models'][model_name], list):
                # Convert old format to new format
                old_signatures = index['models'][model_name]
                index['models'][model_name] = {
                    'name': model_name,
                    'signatures': []
                }
                # Add existing signatures
                for sig in old_signatures:
                    if isinstance(sig, dict) and 'file' in sig:
                        # Extract the actual file path from the log output
                        file_content = sig['file']
                        if 'Output file:' in file_content:
                            actual_path = file_content.split('Output file:')[-1].strip()
                            if actual_path.startswith('../'):
                                actual_path = actual_path[3:]  # Remove '../' prefix
                            sig_filename = os.path.basename(actual_path)
                            sig_hash = sig_filename.split('_')[0]
                            sig_date = sig_filename.split('_')[1].split('.')[0]
                            index['models'][model_name]['signatures'].append({
                                'file': actual_path,
                                'date': sig_date,
                                'hash': sig_hash,
                                'full_hash': sig.get('full_hash', '')
                            })
            
            # Add new signature
            signatures = index['models'][model_name]['signatures']
            
            # Check if signature with same hash already exists for this date
            existing_sig_idx = next(
                (i for i, sig in enumerate(signatures)
                 if sig['date'] == date_part and sig['hash'] == hash_part),
                None
            )
            
            if existing_sig_idx is not None:
                # Replace existing signature
                signatures[existing_sig_idx] = new_signature
            else:
                # Add new signature
                signatures.append(new_signature)
            
            # Sort signatures by date (newest first)
            signatures.sort(key=lambda x: x['date'], reverse=True)
        
        # Update last_updated timestamp
        index['metadata']['last_updated'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Save the index
        with open(index_path, 'w') as f:
            json.dump(index, f, indent=2)
        log("Signatures index updated successfully")
            
    except Exception as e:
        log(f"Error updating signatures index: {str(e)}")
        raise  # Re-raise the exception to ensure we know if this fails

def clean_signatures_index():
    """Remove entries from signatures.json for files that no longer exist"""
    try:
        log("Cleaning signatures index...")
        index_path = '../signatures.json'
        if not os.path.exists(index_path):
            return
            
        with open(index_path, 'r') as f:
            index = json.load(f)
            
        if 'models' not in index:
            return
            
        # Track if we made any changes
        changes_made = False
            
        # Check each model's signatures
        for model_name in list(index['models'].keys()):
            if not isinstance(index['models'][model_name], dict):
                continue
                
            signatures = index['models'][model_name].get('signatures', [])
            valid_signatures = []
            
            for sig in signatures:
                if not isinstance(sig, dict):
                    continue
                    
                file_path = os.path.join('..', sig.get('file', ''))
                if os.path.exists(file_path):
                    valid_signatures.append(sig)
                else:
                    log(f"Removing non-existent signature file from index: {sig.get('file', '')}")
                    changes_made = True
                    
            if valid_signatures:
                index['models'][model_name]['signatures'] = valid_signatures
            else:
                log(f"Removing model with no valid signatures: {model_name}")
                del index['models'][model_name]
                changes_made = True
                
        # Update the index file if changes were made
        if changes_made:
            index['metadata']['last_updated'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            with open(index_path, 'w') as f:
                json.dump(index, f, indent=2)
            log("Signatures index cleaned successfully")
            
    except Exception as e:
        log(f"Error cleaning signatures index: {str(e)}")

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
        
        # Clean up signatures index
        clean_signatures_index()
        
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