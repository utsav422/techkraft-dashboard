# Start from official Python image
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Copy requirements first (so Docker caches this layer)
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Start the FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]