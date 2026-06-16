# Backend Setup (Python + SQLite)

This backend runs on Python 3 using Flask and SQLAlchemy with a local SQLite database.

## Prerequisites
- Python 3.x installed

## Setup
The virtual environment is already initialized. If you ever need to recreate it:
```bash
python3 -m venv venv
```

Activate the environment (optional):
- macOS/Linux: `source venv/bin/activate`
- Windows: `venv\Scripts\activate`

Install dependencies:
```bash
./venv/bin/pip install -r requirements.txt
```

## Running the Server
Start the development server:
```bash
./venv/bin/python src/app.py
```
The server will run on `http://127.0.0.1:5001`.

## Database
The database is configured to run on a local SQLite file located at `instance/database.db`. Tables are automatically created when the server starts.
