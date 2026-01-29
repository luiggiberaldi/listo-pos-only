import os
import shutil
import subprocess
import sys
import platform

# Configuration
PROJECT_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "listo-master")
BUILD_CMD = "npm run electron:build"
CACHE_DIR_WIN = os.path.expandvars(r"%LOCALAPPDATA%\electron-builder\Cache")

def run_build():
    print(f"Starting build in: {PROJECT_ROOT}")
    try:
        # Run the build command
        process = subprocess.run(
            BUILD_CMD,
            cwd=PROJECT_ROOT,
            shell=True,
            check=True,
            capture_output=False  # Let output stream to console
        )
        print("Build completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Build failed with exit code {e.returncode}")
        return False

def clear_cache():
    print(f"Attempting to clear electron-builder cache at: {CACHE_DIR_WIN}")
    if os.path.exists(CACHE_DIR_WIN):
        try:
            shutil.rmtree(CACHE_DIR_WIN)
            print("Cache cleared successfully.")
            return True
        except Exception as e:
            print(f"Failed to clear cache: {e}")
            # Try to escalate or warn user?
            print("WARNING: Could not delete cache. This might be due to a permission issue or locked files.")
            print("Please try deleting the folder manually or running this script as Administrator.")
            return False
    else:
        print("Cache directory not found. Nothing to clear.")
        return True

def main():
    print("=== Listo Master Build Script ===")
    
    # First attempt
    if run_build():
        sys.exit(0)
    
    # If failed, check if we should retry with cache clearing
    print("\n!!! Build Failed. Attempting Auto-Fix: Clearing Cache !!!\n")
    
    if clear_cache():
        print("Retrying build after cache clear...")
        if run_build():
            print("\nSUCCESS: Build succeeded after cache clear.")
            sys.exit(0)
        else:
            print("\nERROR: Build failed again after cache clear.")
            print("Please check the logs above. You may need to:")
            print("1. Run this terminal as Administrator.")
            print("2. Check for antivirus interference.")
            print("3. Ensure no other instances of the app are running.")
            sys.exit(1)
    else:
        print("Could not clear cache. Aborting retry.")
        sys.exit(1)

if __name__ == "__main__":
    main()
