# app/routers/query.py
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from app.models.query import (
    QueryRequest,
    QueryModel,
    QueryResult,
    QueryValidationRequest,
    QueryValidationResult,
    QueryExplainRequest,
    QueryExplainResult,
    QueryHistoryEntry
)