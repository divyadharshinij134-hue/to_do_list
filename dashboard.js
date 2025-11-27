// Dashboard JavaScript
// Check authentication
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
if (!isLoggedIn) {
    window.location.href = '/auth.html';
}

const USER_ID = localStorage.getItem('userId') || "demo-user";
const userName = localStorage.getItem('userName') || 'User';

// Update user name in header
if (document.getElementById('userName')) {
    document.getElementById('userName').textContent = userName;
}

const API_BASE = "/api/tasks";
const CLASSIFIER_API = "/api/classify";
const USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function getLoginStreakData(userId) {
    if (!userId) {
        return { count: 0, best: 0, lastDate: null };
    }
    const key = `loginStreak:${userId}`;
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const count = Number(stored.count) || Number(localStorage.getItem('activeLoginStreak')) || 0;
    const best = Number(stored.best) || Number(localStorage.getItem('bestLoginStreak')) || count;
    const lastDate = stored.lastDate || null;
    return { count, best, lastDate };
}

// Logout functionality
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('userName');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userId');
            localStorage.removeItem('rememberMe');
            window.location.href = '/';
        }
    });
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const url = new URL(API_BASE, window.location.origin);
        url.searchParams.set("userId", USER_ID);
        url.searchParams.set("sortBy", "createdAt");
        url.searchParams.set("order", "desc");
        
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error('Failed to load tasks');
        }
        
        const tasks = await res.json();
        updateDashboard(tasks);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        document.getElementById('recentTasks').innerHTML = 
            '<div class="empty-state">Failed to load tasks. Please try again.</div>';
    }
}

function updateDashboard(tasks) {
    // Calculate stats
    const total = tasks.length;
    const active = tasks.filter(t => !t.completed).length;
    const completed = tasks.filter(t => t.completed).length;
    const highPriority = tasks.filter(t => t.priority === 'high' && !t.completed).length;
    const streakData = getLoginStreakData(USER_ID);

    // Animate stat counters
    animateCount(document.getElementById('totalTasks'), total);
    animateCount(document.getElementById('activeTasks'), active);
    animateCount(document.getElementById('completedTasks'), completed);
    animateCount(document.getElementById('highPriorityTasks'), highPriority);
    animateCount(document.getElementById('loginStreakCount'), streakData.count);
    const streakBestEl = document.getElementById('loginStreakBest');
    if (streakBestEl) {
        const bestLabel = streakData.best === 1 ? 'Best 1 day' : `Best ${streakData.best} days`;
        streakBestEl.textContent = bestLabel;
        if (streakData.lastDate) {
            streakBestEl.setAttribute('title', `Last check-in: ${formatDateKey(streakData.lastDate)}`);
        }
    }

    // Calculate productivity score (0-100)
    const productivityScore = total > 0 ? Math.round((completed / total) * 100) : 0;
    animateCount(document.getElementById('productivityScore'), productivityScore);

    // Focus meter (high priority tasks)
    animateCount(document.getElementById('focusMeter'), highPriority);

    // Estimated finish time (simple calculation based on active tasks)
    const estimatedFinish = calculateEstimatedFinish(active, highPriority);
    document.getElementById('estimatedFinish').textContent = estimatedFinish;

    // Trend (mock calculation - in real app, compare with last week)
    const trend = calculateTrend(completed, total);
    const trendEl = document.getElementById('trendValue');
    trendEl.textContent = trend >= 0 ? `+${trend}%` : `${trend}%`;
    trendEl.style.color = trend >= 0 ? '#10b981' : '#ef4444';

    // Update task distribution
    const totalPercent = total > 0 ? 100 : 0;
    const activePercent = total > 0 ? Math.round((active / total) * 100) : 0;
    const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('activeFill').style.width = `${activePercent}%`;
    document.getElementById('completedFill').style.width = `${completedPercent}%`;
    document.getElementById('activePercent').textContent = `${activePercent}%`;
    document.getElementById('completedPercent').textContent = `${completedPercent}%`;

    // Update Chart.js doughnut with animation
    try {
        if (window.distributionChart && typeof window.distributionChart.data !== 'undefined') {
            window.distributionChart.data.datasets[0].data = [active, completed];
            window.distributionChart.options.plugins.title.text = `Tasks — ${total}`;
            window.distributionChart.update('active');
        }
    } catch (err) {
        // silent fail if Chart isn't ready
        console.warn('Chart update failed', err);
    }

    // Update priority breakdown
    const highCount = tasks.filter(t => t.priority === 'high').length;
    const mediumCount = tasks.filter(t => t.priority === 'medium').length;
    const lowCount = tasks.filter(t => t.priority === 'low').length;

    // animate priority counts for a nicer micro-interaction
    animateCount(document.getElementById('highCount'), highCount);
    animateCount(document.getElementById('mediumCount'), mediumCount);
    animateCount(document.getElementById('lowCount'), lowCount);

    // Update recent tasks (top 5)
    const recentTasks = tasks.slice(0, 5);
    renderRecentTasks(recentTasks);
}

// Animate numeric count from 0 -> target and trigger a pop animation
function animateCount(el, target) {
    if (!el) return;
    const start = 0;
    const duration = 650;
    const startTime = performance.now();

    // remove any previous animation class to retrigger
    el.classList.remove('count-animate');

    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.round(start + (target - start) * easeOutCubic(progress));
        el.textContent = value;

        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            // final value and micro animation
            el.textContent = target;
            // small pop animation
            void el.offsetWidth;
            el.classList.add('count-animate');
            setTimeout(() => el.classList.remove('count-animate'), 800);
        }
    }

    requestAnimationFrame(tick);
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function calculateEstimatedFinish(activeTasks, highPriorityTasks) {
    if (activeTasks === 0) return 'Done!';
    
    // Simple estimation: 30 min per task, 45 min for high priority
    const regularTasks = activeTasks - highPriorityTasks;
    const totalMinutes = (regularTasks * 30) + (highPriorityTasks * 45);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) {
        return `${minutes}m`;
    }
    return `${hours}h ${minutes}m`;
}

function calculateTrend(completed, total) {
    // Mock trend calculation - in real app, compare with last week's data
    if (total === 0) return 0;
    const completionRate = (completed / total) * 100;
    // Simulate trend: if completion rate > 50%, show positive trend
    return completionRate > 50 ? Math.round(Math.random() * 20 + 5) : Math.round(Math.random() * -10 - 5);
}

// Load Chart.js from CDN (returns a promise)
function loadChartJS() {
    if (window.Chart) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load Chart.js'));
        document.head.appendChild(s);
    });
}

function initDistributionChart() {
    const canvas = document.getElementById('distributionChart');
    if (!canvas || !window.Chart) return;
    const ctx = canvas.getContext('2d');

    // create doughnut chart
    window.distributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Active', 'Completed'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#FF6C0C', '#FFE08F'],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1500,
                easing: 'easeOutCubic'
            },
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { mode: 'index' },
                title: { display: true, text: 'Tasks — 0' }
            }
        }
    });
}

function renderRecentTasks(tasks) {
    const container = document.getElementById('recentTasks');
    
    if (tasks.length === 0) {
        container.innerHTML = '<div class="empty-state">No tasks yet. <a href="/todos.html">Create your first task</a></div>';
        return;
    }

    // Clear container and add tasks with stagger animation
    container.innerHTML = '';
    tasks.forEach((task, index) => {
        setTimeout(() => {
            const taskEl = createTaskElement(task);
            container.appendChild(taskEl);
        }, index * 50);
    });
}

function createTaskElement(task) {
    const div = document.createElement('div');
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
    const createdDate = new Date(task.createdAt).toLocaleDateString();
    
    div.className = `task-item ${task.completed ? 'completed' : ''}`;
    div.setAttribute('data-id', task._id);
    div.innerHTML = `
        <input 
            type="checkbox" 
            class="task-checkbox" 
            ${task.completed ? 'checked' : ''}
            onchange="toggleTask('${task._id}', this.checked)"
        >
        <div class="task-info">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-meta">
                <span>📅 Due: ${dueDate}</span>
                <span>🕐 Created: ${createdDate}</span>
                ${task.priority ? `<span class="priority-badge-small ${task.priority}">${task.priority}</span>` : ''}
            </div>
            ${renderTagPills(task.tags)}
        </div>
    `;
    return div;
}

async function toggleTask(id, completed) {
    try {
        const res = await fetch(`${API_BASE}/${id}?userId=${encodeURIComponent(USER_ID)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed })
        });

        if (!res.ok) {
            throw new Error('Failed to update task');
        }

        // Reload dashboard data
        await loadDashboardData();
    } catch (error) {
        console.error('Error toggling task:', error);
        alert('Failed to update task. Please try again.');
        // Reload to reset checkbox
        await loadDashboardData();
    }
}

// Quick actions
document.getElementById('clearCompletedBtn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all completed tasks?')) {
        return;
    }

    try {
        // Get all completed tasks
        const url = new URL(API_BASE, window.location.origin);
        url.searchParams.set("userId", USER_ID);
        const res = await fetch(url);
        const tasks = await res.json();
        
        const completedTasks = tasks.filter(t => t.completed);
        
        // Delete each completed task
        for (const task of completedTasks) {
            await fetch(`${API_BASE}/${task._id}?userId=${encodeURIComponent(USER_ID)}`, {
                method: 'DELETE'
            });
        }

        // Reload dashboard
        await loadDashboardData();
        alert('Completed tasks cleared successfully!');
    } catch (error) {
        console.error('Error clearing completed tasks:', error);
        alert('Failed to clear completed tasks. Please try again.');
    }
});

document.getElementById('refreshBtn')?.addEventListener('click', async () => {
    await loadDashboardData();
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDateKey(dateKey) {
    if (!dateKey) return '';
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderTagPills(tags) {
    if (!Array.isArray(tags) || !tags.length) return '';
    const pills = tags
        .slice(0, 8)
        .map(tag => `<span class="task-tag">${escapeHtml(tag)}</span>`)
        .join('');
    return `<div class="task-tags">${pills}</div>`;
}

const classifierForm = document.getElementById('classifierForm');
let lastParsedTasks = [];
if (classifierForm) {
    classifierForm.addEventListener('submit', handleClassifierSubmit);
}

async function handleClassifierSubmit(event) {
    event.preventDefault();

    const inputEl = document.getElementById('classifierInput');
    const promptEl = document.getElementById('classifierPromptInput');
    const statusEl = document.getElementById('classifierStatus');
    const resultEl = document.getElementById('classifierResult');

    if (!inputEl || !statusEl || !resultEl) return;

    const text = inputEl.value.trim();
    const promptOverride = promptEl?.value.trim();

    if (!text) {
        statusEl.textContent = 'Please describe your task first.';
        resultEl.classList.add('hidden');
        return;
    }

    statusEl.textContent = 'Parsing with Groq...';
    resultEl.classList.remove('hidden');
    resultEl.innerHTML = '<div class="classifier-placeholder">Analyzing your task...</div>';

    const payload = {
        text,
        userId: USER_ID,
        timezone: USER_TIMEZONE
    };

    if (promptOverride) {
        payload.prompt = promptOverride;
    }

    try {
        const res = await fetch(CLASSIFIER_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data?.error || 'Failed to classify task');
        }

        renderClassifierResult(data);
        const parsedCount = Array.isArray(data?.tasks) ? data.tasks.length : 0;
        if (!parsedCount) {
            statusEl.textContent = 'No tasks detected. Try rephrasing or list them separately.';
        } else if (data?.meta?.fallbackUsed) {
            statusEl.textContent = `Parsed ${parsedCount} task${parsedCount > 1 ? 's' : ''} with heuristics backup.`;
        } else {
            statusEl.textContent = `Parsed ${parsedCount} task${parsedCount > 1 ? 's' : ''}!`;
        }
    } catch (error) {
        console.error('Classifier error:', error);
        statusEl.textContent = error.message || 'Failed to parse task.';
        resultEl.innerHTML = `<div class="classifier-placeholder error">${escapeHtml(statusEl.textContent)}</div>`;
    }
}

function renderClassifierResult(data) {
    const resultEl = document.getElementById('classifierResult');
    if (!resultEl) return;
    resultEl.classList.remove('hidden');

    const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
    lastParsedTasks = tasks;

    if (!tasks.length) {
        resultEl.innerHTML = '<div class="classifier-placeholder error">No tasks detected. Try rewording your prompt.</div>';
        return;
    }

    const meta = data?.meta || {};
    const issuesList = Array.isArray(meta.issues) ? meta.issues : [];
    const metaChips = [
        `<span class="classifier-chip">${tasks.length} task${tasks.length > 1 ? 's' : ''}</span>`,
        meta?.model ? `<span class="classifier-chip">${escapeHtml(meta.model)}</span>` : '',
        meta?.latencyMs ? `<span class="classifier-chip">Latency: ${meta.latencyMs}ms</span>` : ''
    ]
        .filter(Boolean)
        .join('');

    const issueNotes = issuesList.length
        ? `<div class="classifier-notes">Notes: ${escapeHtml(issuesList.join(', '))}</div>`
        : '';

    const fallbackNotes = meta?.fallbackUsed
        ? '<div class="classifier-notes">⚠️ Some fields were filled with heuristics due to low confidence.</div>'
        : '';

    const cardsMarkup = tasks
        .map((task, index) => renderClassifierTaskCard(task, index))
        .join('');

    resultEl.innerHTML = `
        <div class="classifier-meta">
            ${metaChips}
        </div>
        ${fallbackNotes}
        ${issueNotes}
        <div class="classifier-task-stack">
            ${cardsMarkup}
        </div>
    `;

    resultEl.querySelectorAll('.add-task-btn').forEach(button => {
        button.addEventListener('click', handleAddParsedTask);
    });
}

function renderClassifierTaskCard(task, index) {
    const fields = [
        { label: 'Deadline', value: formatDateTime(task.deadline) || '—' },
        { label: 'Priority', value: capitalize(task.priority) },
        { label: 'Category', value: capitalize(task.category) },
        { label: 'Estimate', value: formatMinutes(task.estimated_minutes) },
        { label: 'Reminder', value: formatMinutes(task.reminder_minutes_before) },
        { label: 'Recurrence', value: formatRecurrence(task) },
        { label: 'Start Suggestion', value: formatDateTime(task.start_time_suggestion) || '—' },
        { label: 'Source', value: task.source_text || '—' }
    ];

    const grid = fields
        .map(
            field => `
            <div class="classifier-field">
                <span class="field-label">${escapeHtml(field.label)}</span>
                <span class="field-value">${escapeHtml(field.value || '—')}</span>
            </div>
        `
        )
        .join('');

    const confidenceScore = typeof task.confidence === 'number' ? task.confidence : null;
    const confidenceLabel = confidenceScore !== null ? `${Math.round(confidenceScore * 100)}%` : 'Unknown';
    const confidenceChipClass = confidenceScore !== null && confidenceScore >= 0.7 ? 'success' : 'warning';

    const tagsMarkup = renderTagPills(task.tags);

    return `
        <div class="classifier-task-card">
            <div class="classifier-task-card-header">
                <div>
                    <div class="classifier-task-card-title">${escapeHtml(task.title || `Task ${index + 1}`)}</div>
                    <div class="classifier-task-card-subtitle">Task ${index + 1}</div>
                </div>
                <span class="classifier-chip ${confidenceChipClass}">Confidence: ${confidenceLabel}</span>
            </div>
            <div class="classifier-grid">
                ${grid}
            </div>
            ${tagsMarkup}
            <div class="classifier-result-actions">
                <button type="button" class="action-btn solid add-task-btn" data-task-index="${index}">Add to My Tasks</button>
            </div>
        </div>
    `;
}

function formatDateTime(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}

function formatMinutes(minutes) {
    if (!minutes || Number.isNaN(Number(minutes))) return '—';
    const total = Number(minutes);
    if (total < 60) return `${total} min`;
    const hrs = Math.floor(total / 60);
    const mins = total % 60;
    return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function formatRecurrence(task) {
    if (!task?.recurrence || task.recurrence === 'none') return 'None';
    if (task.recurrence === 'custom' && task.recurrence_rule) return task.recurrence_rule;
    return capitalize(task.recurrence);
}

function capitalize(value) {
    if (typeof value !== 'string' || !value.length) return '—';
    return value.charAt(0).toUpperCase() + value.slice(1);
}

async function handleAddParsedTask(event) {
    const statusEl = document.getElementById('classifierStatus');
    const button = event?.currentTarget;
    const index = Number(button?.dataset.taskIndex);
    const task = Array.isArray(lastParsedTasks) ? lastParsedTasks[index] : null;

    if (!task) {
        statusEl.textContent = 'Parse a task before adding.';
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = 'Adding...';
    }

    const title = task.title?.trim() || `Task ${index + 1}`;
    const priority = ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium';
    const dueDate = task.deadline || null;
    const tags = Array.isArray(task.tags) ? task.tags : [];

    try {
        const url = new URL(API_BASE, window.location.origin);
        url.searchParams.set('userId', USER_ID);
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, dueDate, priority, tags })
        });

        if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            throw new Error(payload?.error || 'Failed to save task');
        }

        statusEl.textContent = `“${title}” added to your list!`;
        await loadDashboardData();
    } catch (error) {
        console.error('Add parsed task error:', error);
        statusEl.textContent = error.message || 'Unable to add task.';
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = 'Add to My Tasks';
        }
    }
}

// Initialize dashboard: load Chart.js, init chart, then load data
(async function init() {
    try {
        await loadChartJS();
        initDistributionChart();
    } catch (err) {
        console.warn('Chart.js failed to load, continuing without charts.', err);
    }

    // initial data load
    await loadDashboardData();
})();

