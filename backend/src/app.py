import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load env variables from root level .env
load_dotenv()

from models import db, User, Task
from auth import hash_password, check_password, generate_token, token_required

app = Flask(__name__)
CORS(app)

# App Configuration
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'dev-secret-key-123456!')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Init Database
db.init_app(app)

# Ensure tables exist
with app.app_context():
    db.create_all()

@app.route('/')
def home():
    return jsonify({
        'message': 'Team Task Manager Python API running with SQLite successfully!',
        'status': 'healthy'
    })

# AUTH ENDPOINTS
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not username or not email or not password:
        return jsonify({'message': 'Please provide username, email, and password.'}), 400
        
    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists.'}), 400
        
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already exists.'}), 400
        
    hashed_pwd = hash_password(password)
    new_user = User(username=username, email=email, password_hash=hashed_pwd)
    
    try:
        db.session.add(new_user)
        db.session.commit()
        
        token = generate_token(new_user.id)
        return jsonify({
            'message': 'User registered successfully!',
            'token': token,
            'user': new_user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to register user: {str(e)}'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'message': 'Please provide email and password.'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        # Fallback to username login
        user = User.query.filter_by(username=email).first()
        
    if not user or not check_password(password, user.password_hash):
        return jsonify({'message': 'Invalid credentials.'}), 401
        
    token = generate_token(user.id)
    return jsonify({
        'message': 'Logged in successfully!',
        'token': token,
        'user': user.to_dict()
    }), 200

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_me(current_user):
    return jsonify(current_user.to_dict()), 200

# USER ENDPOINTS
@app.route('/api/users', methods=['GET'])
@token_required
def get_users(current_user):
    users = User.query.all()
    return jsonify([user.to_dict() for user in users]), 200

# TASK ENDPOINTS
@app.route('/api/tasks', methods=['GET'])
@token_required
def get_tasks(current_user):
    # Retrieve all tasks or tasks involving the current user
    tasks = Task.query.all()
    return jsonify([task.to_dict() for task in tasks]), 200

@app.route('/api/tasks', methods=['POST'])
@token_required
def create_task(current_user):
    data = request.get_json() or {}
    title = data.get('title')
    description = data.get('description', '')
    status = data.get('status', 'Pending')
    priority = data.get('priority', 'Medium')
    due_date = data.get('due_date', '')
    assigned_to = data.get('assigned_to') # User ID
    
    if not title:
        return jsonify({'message': 'Task title is required.'}), 400
        
    # Check if assigned user exists if provided
    if assigned_to:
        assigned_user = User.query.get(assigned_to)
        if not assigned_user:
            return jsonify({'message': 'Assigned user does not exist.'}), 400
            
    new_task = Task(
        title=title,
        description=description,
        status=status,
        priority=priority,
        due_date=due_date,
        assigned_to=assigned_to,
        created_by=current_user.id
    )
    
    try:
        db.session.add(new_task)
        db.session.commit()
        return jsonify(new_task.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to create task: {str(e)}'}), 500

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@token_required
def update_task(current_user, task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'message': 'Task not found.'}), 404
        
    data = request.get_json() or {}
    task.title = data.get('title', task.title)
    task.description = data.get('description', task.description)
    task.status = data.get('status', task.status)
    task.priority = data.get('priority', task.priority)
    task.due_date = data.get('due_date', task.due_date)
    
    assigned_to = data.get('assigned_to')
    if assigned_to is not None:
        if assigned_to == '':
            task.assigned_to = None
        else:
            assigned_user = User.query.get(assigned_to)
            if not assigned_user:
                return jsonify({'message': 'Assigned user does not exist.'}), 400
            task.assigned_to = assigned_to
            
    try:
        db.session.commit()
        return jsonify(task.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update task: {str(e)}'}), 500

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@token_required
def delete_task(current_user, task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'message': 'Task not found.'}), 404
        
    try:
        db.session.delete(task)
        db.session.commit()
        return jsonify({'message': 'Task deleted successfully!'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to delete task: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
