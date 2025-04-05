import asyncio
from asyncio import Future

import pytest


# Make tests run with pytest-asyncio
@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# Helper for working with async tests
def async_return(result):
    """Create a future that returns the given result."""
    future = Future()
    future.set_result(result)
    return future
