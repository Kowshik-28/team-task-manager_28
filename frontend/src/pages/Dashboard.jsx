import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  
  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Pending');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Headers helper
  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Parse current user from local storage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }

    fetchTasks();
    fetchUsers();
  }, [token]);

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_BASE}/tasks`, getHeaders());
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
      if (err.response?.status === 401) handleLogout();
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/users`, getHeaders());
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus('Pending');
    setPriority('Medium');
    setDueDate('');
    setAssignedTo('');
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/tasks`, {
        title,
        description,
        status,
        priority,
        due_date: dueDate,
        assigned_to: assignedTo ? parseInt(assignedTo) : null
      }, getHeaders());
      
      setIsCreateOpen(false);
      resetForm();
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create task');
    }
  };

  const openEditModal = (task) => {
    setActiveTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(task.due_date || '');
    setAssignedTo(task.assigned_to || '');
    setIsEditOpen(true);
  };

  const handleEditTask = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE}/tasks/${activeTask.id}`, {
        title,
        description,
        status,
        priority,
        due_date: dueDate,
        assigned_to: assignedTo ? parseInt(assignedTo) : ''
      }, getHeaders());
      
      setIsEditOpen(false);
      setActiveTask(null);
      resetForm();
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await axios.delete(`${API_BASE}/tasks/${taskId}`, getHeaders());
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      await axios.put(`${API_BASE}/tasks/${task.id}`, {
        ...task,
        status: newStatus
      }, getHeaders());
      fetchTasks();
    } catch (err) {
      alert('Failed to change status');
    }
  };

  // Filter tasks based on Search Query & Priority
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  // Task lists per columns
  const pendingTasks = filteredTasks.filter(t => t.status === 'Pending');
  const progressTasks = filteredTasks.filter(t => t.status === 'In Progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'Completed');

  // Stats calculation
  const totalTasks = tasks.length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const progressCount = tasks.filter(t => t.status === 'In Progress').length;
  const pendingCount = tasks.filter(t => t.status === 'Pending').length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="glass-panel" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        marginBottom: '24px',
        background: 'var(--bg-card)'
      }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            TaskFlow
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>SQLite Edition</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {currentUser && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{currentUser.username}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{currentUser.email}</div>
            </div>
          )}
          <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            Logout
          </button>
        </div>
      </header>

      {/* Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        <div className="glass-panel" style={{ padding: '20px', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Tasks</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalTasks}</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Pending</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-pending)' }}>{pendingCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>In Progress</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-progress)' }}>{progressCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Completed</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-completed)', fontWeight: 600 }}>{progressPercentage}%</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-completed)', marginBottom: '8px' }}>{completedCount}</div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercentage}%`, height: '100%', background: 'var(--color-completed)', borderRadius: '2px', transition: 'width 0.3s ease' }}></div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        marginBottom: '24px',
        background: 'var(--bg-card)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '16px', flex: 1, minWidth: '280px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: '300px', padding: '8px 16px', fontSize: '0.875rem' }}
          />
          <select
            className="form-input"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ width: '130px', padding: '8px 16px', fontSize: '0.875rem' }}
          >
            <option value="All">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
          + Add New Task
        </button>
      </div>

      {/* Columns Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        flex: 1
      }}>
        {/* Pending Column */}
        <div className="glass-panel" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-pending)' }}></span>
              Pending
            </h3>
            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>{pendingTasks.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
            {pendingTasks.map(task => (
              <TaskCard key={task.id} task={task} onEdit={openEditModal} onDelete={handleDeleteTask} onStatusChange={handleStatusChange} users={users} />
            ))}
            {pendingTasks.length === 0 && <EmptyStateColumn />}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="glass-panel" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-progress)' }}></span>
              In Progress
            </h3>
            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>{progressTasks.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
            {progressTasks.map(task => (
              <TaskCard key={task.id} task={task} onEdit={openEditModal} onDelete={handleDeleteTask} onStatusChange={handleStatusChange} users={users} />
            ))}
            {progressTasks.length === 0 && <EmptyStateColumn />}
          </div>
        </div>

        {/* Completed Column */}
        <div className="glass-panel" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-completed)' }}></span>
              Completed
            </h3>
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>{completedTasks.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
            {completedTasks.map(task => (
              <TaskCard key={task.id} task={task} onEdit={openEditModal} onDelete={handleDeleteTask} onStatusChange={handleStatusChange} users={users} />
            ))}
            {completedTasks.length === 0 && <EmptyStateColumn />}
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Add New Task</h2>
              <button onClick={() => setIsCreateOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Develop user authentication" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide detailed steps..." style={{ resize: 'none' }}></textarea>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Assign To</label>
                  <select className="form-input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setIsCreateOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Edit Task</h2>
              <button onClick={() => { setIsEditOpen(false); setActiveTask(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
            </div>

            <form onSubmit={handleEditTask}>
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: 'none' }}></textarea>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Assign To</label>
                  <select className="form-input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => { setIsEditOpen(false); setActiveTask(null); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Single Task Card Component
function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'High': return 'badge-high';
      case 'Low': return 'badge-low';
      default: return 'badge-medium';
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '16px',
      background: 'var(--bg-card-hover)',
      borderLeft: `4px solid ${
        task.status === 'Completed' ? 'var(--color-completed)' :
        task.status === 'In Progress' ? 'var(--color-progress)' : 'var(--color-pending)'
      }`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <span className={`badge ${getPriorityClass(task.priority)}`}>{task.priority}</span>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => onEdit(task)} 
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
            title="Edit Task"
          >
            ✏️
          </button>
          <button 
            onClick={() => onDelete(task.id)} 
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem' }}
            title="Delete Task"
          >
            🗑️
          </button>
        </div>
      </div>

      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px' }}>{task.title}</h4>
      {task.description && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', whiteSpace: 'pre-line' }}>
          {task.description}
        </p>
      )}

      {/* Due Date & Assignee */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderTop: '1px solid rgba(255,255,255,0.05)',
        paddingTop: '12px',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        <div>
          {task.due_date ? `📅 ${task.due_date}` : 'No due date'}
        </div>
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
          {task.assignee_name ? `👤 ${task.assignee_name}` : 'Unassigned'}
        </div>
      </div>

      {/* Move Status Quick Buttons */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '12px', justifyContent: 'flex-end' }}>
        {task.status !== 'Pending' && (
          <button 
            onClick={() => onStatusChange(task, 'Pending')}
            className="btn btn-secondary" 
            style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '4px' }}
          >
            ← Pending
          </button>
        )}
        {task.status !== 'In Progress' && (
          <button 
            onClick={() => onStatusChange(task, 'In Progress')}
            className="btn btn-secondary" 
            style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '4px' }}
          >
            In Progress
          </button>
        )}
        {task.status !== 'Completed' && (
          <button 
            onClick={() => onStatusChange(task, 'Completed')}
            className="btn btn-secondary" 
            style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '4px' }}
          >
            Completed →
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyStateColumn() {
  return (
    <div style={{
      padding: '30px 20px',
      textAlign: 'center',
      color: 'var(--text-muted)',
      fontSize: '0.8rem',
      border: '1px dashed var(--border-color)',
      borderRadius: '8px'
    }}>
      No tasks in this list
    </div>
  );
}
