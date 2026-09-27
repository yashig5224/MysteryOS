import os, sys

# Resolve the absolute path to the backend/app directory (sibling to this package)
_backend_app_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "app"))
# Ensure the path is in sys.path for module resolution
if _backend_app_path not in sys.path:
    sys.path.insert(0, _backend_app_path)
# Define this package as a namespace pointing to the backend/app package
__path__ = [_backend_app_path]
