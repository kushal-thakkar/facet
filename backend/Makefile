.PHONY: format lint typecheck test

format:
	python -m black .
	python -m isort .

lint:
	python -m flake8

typecheck:
	python -m mypy .

test:
	python -m pytest

install-dev:
	pip install -r requirements-dev.txt

ci-check: format lint typecheck test