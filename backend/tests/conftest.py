import sys
from pathlib import Path

# Make the backend package importable regardless of the pytest working directory.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

from app import store  # noqa: E402


@pytest.fixture(autouse=True)
def _clear_store():
    store.clear()
    yield
    store.clear()
