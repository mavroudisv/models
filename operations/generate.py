import json
import os
import subprocess
from datetime import datetime
from pathlib import Path

def load_models():
    """Load the list of models from models.json"""
    with open('models.json', 'r') as f:
        data = json.load(f)
        return data['models']

def generate_signature(model_name):
    """Generate a signature for a specific model"""
    try:
        # Create signatures directory if it doesn't exist
        os.makedirs('../signatures', exist_ok=True)
        
        # Create model directory if it doesn't exist
        model_dir = f'../signatures/{model_name}'
        os.makedirs(model_dir, exist_ok=True)
        
        # Generate signature using the stampr_ai-collector
        result = subprocess.run(
            ['python', '-m', 'stampr_ai_collector', '--model', model_name],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"Error generating signature for {model_name}:")
            print(result.stderr)
            return False
            
        # The collector should output the path to the generated signature
        signature_path = result.stdout.strip()
        if not signature_path:
            print(f"No signature path returned for {model_name}")
            return False
            
        # Update signatures.json
        update_signatures_index(model_name, signature_path)
        
        return True
        
    except Exception as e:
        print(f"Error generating signature for {model_name}: {str(e)}")
        return False

def update_signatures_index(model_name, signature_path):
    """Update the signatures.json index file"""
    try:
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
        
        # Update the index
        if model_name not in index['models']:
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
            
    except Exception as e:
        print(f"Error updating signatures index: {str(e)}")

def main():
    """Main function to generate signatures for all models"""
    try:
        # Load models to test
        models = load_models()
        print(f"Generating signatures for models: {', '.join(models)}")
        
        # Generate signatures for each model
        for model in models:
            print(f"\nGenerating signature for {model}...")
            success = generate_signature(model)
            if success:
                print(f"Successfully generated signature for {model}")
            else:
                print(f"Failed to generate signature for {model}")
                
    except Exception as e:
        print(f"Error in main: {str(e)}")

if __name__ == '__main__':
    main() 