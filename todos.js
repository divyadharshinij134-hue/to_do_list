// Todo app JavaScript with API integration
// Check authentication
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
if (!isLoggedIn) {
    // Redirect to login page if not authenticated
    window.location.href = '/auth.html';
}

const USER_ID = localStorage.getItem('userId') || "demo-user";
if (document.getElementById("userIdTag")) {
    document.getElementById("userIdTag").textContent = USER_ID;
}

// Get user name from localStorage or use default
const userName = localStorage.getItem('userName') || 'User';
if (document.getElementById('userName')) {
    document.getElementById('userName').textContent = userName;
}

// Check authentication state for header
const userSection = document.getElementById('userSection');
const authSection = document.getElementById('authSection');
if (isLoggedIn) {
    if (userSection) userSection.style.display = 'flex';
    if (authSection) authSection.style.display = 'none';
} else {
    if (userSection) userSection.style.display = 'none';
    if (authSection) authSection.style.display = 'block';
}

const API_BASE = "/api/tasks";

const els = {
    form: document.getElementById("taskForm"),
    title: document.getElementById("title"),
    dueDate: document.getElementById("dueDate"),
    priority: document.getElementById("priority"),
    list: document.getElementById("taskList"),
    empty: document.getElementById("tasksEmpty"),
    loading: document.getElementById("loading"),
    sortBy: document.getElementById("sortBy"),
    order: document.getElementById("order"),
    applySort: document.getElementById("applySort")
};

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

function fmtDate(d) {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt)) return "—";
    return dt.toLocaleDateString();
}

function priorityBadge(p) {
    const map = {
        low: "bg-secondary",
        medium: "bg-warning",
        high: "bg-danger"
    };
    return `<span class="badge ${map[p] || "bg-secondary"} priority-pill">${p}</span>`;
}

function renderTasks(tasks) {
    els.list.innerHTML = "";
    
    if (!tasks.length) {
        els.empty.classList.remove("d-none");
        els.loading.classList.add("d-none");
        return;
    }
    
    els.empty.classList.add("d-none");
    els.loading.classList.add("d-none");

    for (const t of tasks) {
        const li = document.createElement("li");
        li.className = `list-group-item task-row d-flex align-items-center gap-2 ${t.completed ? "completed" : ""}`;
        li.dataset.id = t._id;

        li.innerHTML = `
            <div class="d-flex align-items-center me-2">
                ${t.completed ? 
                    `<img src="check-icon.gif" alt="Completed" style="width: 24px; height: 24px; object-fit: contain; cursor: pointer;" class="task-check-icon">` : 
                    `<input class="form-check-input" type="checkbox" aria-label="Complete">`
                }
            </div>
            <div class="flex-grow-1 task-content">
                <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="task-title fw-semibold">${escapeHtml(t.title)}</span>
                    ${priorityBadge(t.priority)}
                </div>
                <div class="task-meta">
                    <img src="calendar-icon.gif" alt="Due date" style="width: 14px; height: 14px; object-fit: contain; vertical-align: middle; margin-right: 4px;">
                    Due: ${fmtDate(t.dueDate)} • 
                    <img src="clock-icon.gif" alt="Created" style="width: 14px; height: 14px; object-fit: contain; vertical-align: middle; margin-right: 4px; margin-left: 4px;">
                    Created: ${new Date(t.createdAt).toLocaleString()}
                </div>
            </div>
            <div class="btn-group">
                <button class="btn btn-sm btn-outline-secondary edit">Edit</button>
                <button class="btn btn-sm btn-outline-danger delete">
                    <img src="trash-icon.gif" alt="Delete" style="width: 16px; height: 16px; object-fit: contain; vertical-align: middle;">
                </button>
            </div>
        `;

        // Toggle complete
        const checkbox = li.querySelector('input[type="checkbox"]');
        const checkIcon = li.querySelector('.task-check-icon');
        
        if (checkbox) {
            checkbox.addEventListener("change", async (e) => {
                await updateTask(t._id, { completed: e.target.checked });
                await loadTasks();
            });
        }
        
        if (checkIcon) {
            checkIcon.addEventListener("click", async () => {
                await updateTask(t._id, { completed: false });
                await loadTasks();
            });
        }

        // Edit
        li.querySelector(".edit").addEventListener("click", async () => {
            const newTitle = prompt("Update title:", t.title);
            if (newTitle === null) return;
            const newDue = prompt("Update due date (YYYY-MM-DD or empty):", t.dueDate ? t.dueDate.slice(0, 10) : "");
            const newPriority = prompt('Update priority ("low","medium","high"):', t.priority);
            
            if (newTitle !== null) {
                await updateTask(t._id, {
                    title: newTitle.trim(),
                    dueDate: newDue ? newDue : null,
                    priority: (newPriority || "").toLowerCase() || t.priority
                });
                await loadTasks();
            }
        });

        // Delete
        li.querySelector(".delete").addEventListener("click", async () => {
            if (!confirm("Delete this task?")) return;
            await deleteTask(t._id);
            await loadTasks();
        });

        els.list.appendChild(li);
    }
}

async function loadTasks() {
    try {
        if (els.loading) els.loading.classList.remove("d-none");
        if (els.empty) els.empty.classList.add("d-none");
        
        const url = new URL(API_BASE, window.location.origin);
        url.searchParams.set("userId", USER_ID);
        url.searchParams.set("sortBy", els.sortBy.value);
        url.searchParams.set("order", els.order.value);
        
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error('Failed to load tasks');
        }
        
        const data = await res.json();
        renderTasks(data);
    } catch (error) {
        if (els.loading) els.loading.classList.add("d-none");
        alert("Failed to load tasks: " + error.message);
        console.error("Error loading tasks:", error);
    }
}

async function createTask(payload) {
    const res = await fetch(`${API_BASE}?userId=${encodeURIComponent(USER_ID)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || res.statusText);
    }
    
    return await res.json();
}

async function updateTask(id, payload) {
    const res = await fetch(`${API_BASE}/${id}?userId=${encodeURIComponent(USER_ID)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || res.statusText);
    }
    
    return await res.json();
}

async function deleteTask(id) {
    const res = await fetch(`${API_BASE}/${id}?userId=${encodeURIComponent(USER_ID)}`, {
        method: "DELETE"
    });
    
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || res.statusText);
    }
    
    return await res.json();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handlers
els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = els.title.value.trim();
    if (!title) return;
    
    try {
        await createTask({
            title,
            dueDate: els.dueDate.value || null,
            priority: els.priority.value
        });
        els.form.reset();
        await loadTasks();
    } catch (error) {
        alert("Create failed: " + error.message);
    }
});

els.applySort.addEventListener("click", loadTasks);

// Initial load
loadTasks();

