# app/services/exploration_service.py
import json
import logging
import os
from typing import Any, Dict, List, Optional

from models.explorations import Exploration

logger = logging.getLogger(__name__)


class ExplorationService:
    """
    Service for managing saved explorations
    """

    def __init__(self):
        """
        Initialize the exploration service
        """
        # In-memory storage for explorations (would be replaced with a database in production)
        self.explorations = []

        # Try to load explorations from file (for development/testing)
        self._load_explorations()

    async def get_all_explorations(self) -> List[Exploration]:
        """
        Get all explorations

        Returns:
            List of explorations
        """
        return self.explorations

    async def get_exploration(self, exploration_id: str) -> Optional[Exploration]:
        """
        Get an exploration by ID

        Args:
            exploration_id: The exploration ID

        Returns:
            Exploration or None if not found
        """
        for exploration in self.explorations:
            if exploration.id == exploration_id:
                return exploration

        return None

    async def create_exploration(self, exploration: Exploration) -> Exploration:
        """
        Create a new exploration

        Args:
            exploration: The exploration to create

        Returns:
            The created exploration
        """
        # Add to explorations list
        self.explorations.append(exploration)

        # Save explorations to file (for development/testing)
        self._save_explorations()

        return exploration

    async def update_exploration(self, exploration: Exploration) -> Exploration:
        """
        Update an existing exploration

        Args:
            exploration: The exploration to update

        Returns:
            The updated exploration
        """
        # Find and update the exploration
        for i, existing_exploration in enumerate(self.explorations):
            if existing_exploration.id == exploration.id:
                self.explorations[i] = exploration
                break

        # Save explorations to file (for development/testing)
        self._save_explorations()

        return exploration

    async def delete_exploration(self, exploration_id: str) -> None:
        """
        Delete an exploration

        Args:
            exploration_id: The exploration ID to delete
        """
        # Find and remove the exploration
        self.explorations = [exp for exp in self.explorations if exp.id != exploration_id]

        # Save explorations to file (for development/testing)
        self._save_explorations()

    def _load_explorations(self) -> None:
        """
        Load explorations from file (for development/testing)
        """
        try:
            # Check if explorations file exists
            if os.path.exists("explorations.json"):
                with open("explorations.json", "r") as f:
                    explorations_data = json.load(f)

                # Convert to Exploration objects
                self.explorations = [Exploration(**exp) for exp in explorations_data]
        except Exception as e:
            logger.error(f"Error loading explorations: {str(e)}")

    def _save_explorations(self) -> None:
        """
        Save explorations to file (for development/testing)
        """
        try:
            # Convert Exploration objects to dictionaries
            explorations_data = [exp.dict() for exp in self.explorations]

            # Save to file
            with open("explorations.json", "w") as f:
                json.dump(explorations_data, f, default=str, indent=2)
        except Exception as e:
            logger.error(f"Error saving explorations: {str(e)}")
