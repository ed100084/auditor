#!/bin/bash
# Azure App Service startup script
pip install -r requirements.txt
gunicorn -w 2 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000 --timeout 120
