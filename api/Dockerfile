# Use a slim Python 3.11 base image
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Install build dependencies if needed (e.g. for building wheels, though pip has prebuilt wheels for slim)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements.txt and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files (including models, scripts, database excel)
COPY . .

# Expose port 8000 for FastAPI
EXPOSE 8000

# Start Uvicorn backend server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
