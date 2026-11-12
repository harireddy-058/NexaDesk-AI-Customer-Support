
/* =====================================================
   NEXADESK — MAIN APPLICATION
   Frontend: HTML, CSS, JavaScript
   Backend: Node.js, Express, MongoDB
   ===================================================== */

const API_BASE = "/api";

const $ = (selector) => document.querySelector(selector);

const state = {
    token: localStorage.getItem("nexadesk_token"),
    user: null,
    tickets: [],
    knowledge: [],
    team: [],
    currentPage: "overview",
    socket: null,
    search: ""
};

/* =====================================================
   API HELPER
   ===================================================== */

async function api(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (state.token) {
        headers.Authorization = `Bearer ${state.token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401 && state.token) {
            logout(false);
        }

        throw new Error(data.message || data.error || "Something went wrong");
    }

    return data;
}

/* =====================================================
   UTILITY FUNCTIONS
   ===================================================== */

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function initials(name = "User") {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() || "")
        .join("");
}

function formatDate(date) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function formatDateTime(date) {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function notify(message, type = "success") {
    const region = $("#toasts");
    if (!region) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    region.appendChild(toast);

    setTimeout(() => toast.remove(), 3500);
}

function statusClass(status = "") {
    const value = status.toLowerCase().replace(/\s+/g, "-");

    if (value === "resolved") return "status-resolved";
    if (value === "closed") return "status-closed";
    if (value === "pending") return "status-pending";

    return "status-open";
}

function priorityClass(priority = "") {
    const value = priority.toLowerCase();

    if (value === "urgent" || value === "high") {
        return value === "urgent" ? "priority-urgent" : "priority-high";
    }

    if (value === "medium") return "priority-medium";

    return "priority-low";
}

function getTicketNumber(ticket) {
    return ticket.ticketNumber || ticket._id || "—";
}

function getCustomerName(ticket) {
    return ticket.customerName ||
        ticket.customer?.name ||
        ticket.name ||
        "Unknown customer";
}

function getCustomerEmail(ticket) {
    return ticket.customerEmail ||
        ticket.customer?.email ||
        ticket.email ||
        "";
}

function getAgentName(ticket) {
    return ticket.assignedTo?.name ||
        ticket.assignee?.name ||
        ticket.assignedToName ||
        "Unassigned";
}

function getTicketStatus(ticket) {
    return ticket.status || "Open";
}

function getTicketPriority(ticket) {
    return ticket.priority || "Medium";
}

function getTicketSubject(ticket) {
    return ticket.subject || ticket.title || "Untitled ticket";
}

function getTicketId(ticket) {
    return ticket._id || ticket.id;
}

/* =====================================================
   AUTHENTICATION
   ===================================================== */

function showLogin(error = "") {
    const root = $("#authRoot");
    const shell = $("#appShell");

    if (shell) shell.hidden = true;
    if (!root) return;

    root.style.display = "flex";

    root.innerHTML = `
        <div class="auth-card">
            <div class="auth-brand">
                <div class="brand-mark">N</div>
                <h2>NexaDesk</h2>
            </div>

            <h1 class="auth-heading">Welcome back</h1>

            <p class="auth-subtitle">
                Sign in to manage customer conversations
                and support operations.
            </p>

            ${error ? `
                <div class="auth-error">${escapeHTML(error)}</div>
            ` : ""}

            <form id="loginForm" class="auth-form">

                <div class="form-group">
                    <label for="loginEmail">Email address</label>
                    <input
                        id="loginEmail"
                        name="email"
                        type="email"
                        placeholder="you@company.com"
                        value="admin@nexadesk.local"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="loginPassword">Password</label>
                    <input
                        id="loginPassword"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        value="ChangeMe123!"
                        required
                    >
                </div>

                <button class="auth-submit" type="submit">
                    Sign in to NexaDesk
                </button>
            </form>

            <div class="auth-footer">
                Don't have an account?
                <button id="showRegister">Create account</button>
            </div>

            <div class="auth-demo">
                <b>Demo login</b><br>
                Email: admin@nexadesk.local<br>
                Password: ChangeMe123!
            </div>
        </div>
    `;

    $("#loginForm").addEventListener("submit", login);
    $("#showRegister").addEventListener("click", showRegister);
}

function showRegister() {
    const root = $("#authRoot");

    root.innerHTML = `
        <div class="auth-card">
            <div class="auth-brand">
                <div class="brand-mark">N</div>
                <h2>NexaDesk</h2>
            </div>

            <h1 class="auth-heading">Create your account</h1>

            <p class="auth-subtitle">
                Set up your NexaDesk support workspace.
            </p>

            <div id="registerError"></div>

            <form id="registerForm" class="auth-form">

                <div class="form-group">
                    <label>Full name</label>
                    <input name="name" placeholder="Your name" required>
                </div>

                <div class="form-group">
                    <label>Email address</label>
                    <input
                        name="email"
                        type="email"
                        placeholder="you@company.com"
                        required
                    >
                </div>

                <div class="form-group">
                    <label>Password</label>
                    <input
                        name="password"
                        type="password"
                        minlength="8"
                        placeholder="Minimum 8 characters"
                        required
                    >
                </div>

                <button class="auth-submit" type="submit">
                    Create account
                </button>

            </form>

            <div class="auth-footer">
                Already registered?
                <button id="showLogin">Sign in</button>
            </div>
        </div>
    `;

    $("#registerForm").addEventListener("submit", register);

    $("#showLogin").addEventListener("click", () => showLogin());
}

async function login(event) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    try {
        const result = await api("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email: form.get("email"),
                password: form.get("password")
            })
        });

        state.token = result.token || result.accessToken;
        state.user = result.user;

        if (!state.token) {
            throw new Error("The server did not return an authentication token.");
        }

        localStorage.setItem("nexadesk_token", state.token);

        await startApplication();

    } catch (error) {
        showLogin(error.message);
    }
}

async function register(event) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    try {
        const result = await api("/auth/register", {
            method: "POST",
            body: JSON.stringify({
                name: form.get("name"),
                email: form.get("email"),
                password: form.get("password")
            })
        });

        state.token = result.token || result.accessToken;
        state.user = result.user;

        if (!state.token) {
            throw new Error("The server did not return an authentication token.");
        }

        localStorage.setItem("nexadesk_token", state.token);

        await startApplication();

    } catch (error) {
        const errorBox = $("#registerError");

        if (errorBox) {
            errorBox.innerHTML = `
                <div class="auth-error">${escapeHTML(error.message)}</div>
            `;
        }
    }
}

function logout(showMessage = true) {
    localStorage.removeItem("nexadesk_token");

    if (state.socket) {
        state.socket.disconnect();
        state.socket = null;
    }

    state.token = null;
    state.user = null;
    state.tickets = [];
    state.knowledge = [];
    state.team = [];

    showLogin();

    if (showMessage) {
        notify("You have been signed out.");
    }
}

/* =====================================================
   APPLICATION STARTUP
   ===================================================== */

async function startApplication() {
    try {
        if (!state.token) {
            showLogin();
            return;
        }

        const result = await api("/auth/me");
        state.user = result.user || result;

        $("#authRoot").style.display = "none";
        $("#appShell").hidden = false;

        updateProfile();
        connectSocket();

        await loadInitialData();
        renderPage("overview");

    } catch (error) {
        console.error("Application startup failed:", error);
        logout(false);
        showLogin("Your session has expired. Please sign in again.");
    }
}

async function loadInitialData() {
    const results = await Promise.allSettled([
        loadTickets(),
        loadKnowledge()
    ]);

    results.forEach((result) => {
        if (result.status === "rejected") {
            console.error(result.reason);
        }
    });
}

/* =====================================================
   USER PROFILE
   ===================================================== */

function updateProfile() {
    const user = state.user || {};

    const name = user.name || user.fullName || "NexaDesk User";
    const role = user.role || "Agent";

    const sidebarName = $("#sidebarUserName");
    const sidebarRole = $("#sidebarUserRole");
    const sidebarAvatar = $("#sidebarAvatar");
    const topProfile = $("#topProfile");

    if (sidebarName) sidebarName.textContent = name;
    if (sidebarRole) sidebarRole.textContent = role;
    if (sidebarAvatar) sidebarAvatar.textContent = initials(name);
    if (topProfile) topProfile.textContent = initials(name);

    if (sidebarRole) {
        sidebarRole.textContent =
            role.charAt(0).toUpperCase() + role.slice(1);
    }
}

/* =====================================================
   SOCKET.IO
   ===================================================== */

function connectSocket() {
    if (typeof io !== "function") {
        console.warn("Socket.IO client is unavailable.");
        return;
    }

    if (state.socket) {
        state.socket.disconnect();
    }

    state.socket = io({
        auth: {
            token: state.token
        }
    });

    state.socket.on("connect", () => {
        console.log("NexaDesk real-time connection established.");
    });

    state.socket.on("ticket:created", async () => {
        await loadTickets();
        renderPage(state.currentPage);
    });

    state.socket.on("ticket:updated", async () => {
        await loadTickets();
        renderPage(state.currentPage);
    });

    state.socket.on("ticket:deleted", async () => {
        await loadTickets();
        renderPage(state.currentPage);
    });

    state.socket.on("disconnect", () => {
        console.log("NexaDesk real-time connection disconnected.");
    });
}

/* =====================================================
   TICKET DATA
   ===================================================== */

async function loadTickets() {
    const result = await api("/tickets");

    state.tickets = Array.isArray(result)
        ? result
        : result.tickets || result.data || [];

    updateTicketCount();

    return state.tickets;
}

function updateTicketCount() {
    const count = state.tickets.filter(ticket => {
        const status = getTicketStatus(ticket).toLowerCase();
        return status !== "resolved" && status !== "closed";
    }).length;

    const element = $("#navOpenCount");

    if (element) {
        element.textContent = count;
    }
}

/* =====================================================
   KNOWLEDGE DATA
   ===================================================== */

async function loadKnowledge() {
    const result = await api("/knowledge");

    state.knowledge = Array.isArray(result)
        ? result
        : result.documents || result.articles || result.data || [];

    return state.knowledge;
}

/* =====================================================
   TEAM DATA
   ===================================================== */

async function loadTeam() {
    const result = await api("/team");

    state.team = Array.isArray(result)
        ? result
        : result.users || result.team || result.data || [];

    return state.team;
}

/* =====================================================
   NAVIGATION
   ===================================================== */

function navigate(page) {
    state.currentPage = page;

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === page
        );
    });

    const sidebar = $("#sidebar");
    if (sidebar) sidebar.classList.remove("open");

    renderPage(page);
}

function renderPage(page) {
    state.currentPage = page;

    const content = $("#content");
    const crumb = $("#crumbPage");

    if (!content) return;

    const titles = {
        overview: "Overview",
        inbox: "Ticket inbox",
        customers: "Customers",
        knowledge: "Knowledge base",
        assistant: "AI assistant",
        analytics: "Analytics",
        team: "Team & agents",
        settings: "Settings"
    };

    if (crumb) {
        crumb.textContent = titles[page] || "Overview";
    }

    const pages = {
        overview: renderOverview,
        inbox: renderInbox,
        customers: renderCustomers,
        knowledge: renderKnowledge,
        assistant: renderAssistant,
        analytics: renderAnalytics,
        team: renderTeam,
        settings: renderSettings
    };

    (pages[page] || renderOverview)();
}

/* =====================================================
   OVERVIEW PAGE
   ===================================================== */

function renderOverview() {
    const content = $("#content");

    const tickets = state.tickets;

    const open = tickets.filter(ticket =>
        ["open", "pending"].includes(
            getTicketStatus(ticket).toLowerCase()
        )
    ).length;

    const resolved = tickets.filter(ticket =>
        ["resolved", "closed"].includes(
            getTicketStatus(ticket).toLowerCase()
        )
    ).length;

    const urgent = tickets.filter(ticket =>
        ["urgent", "high"].includes(
            getTicketPriority(ticket).toLowerCase()
        )
    ).length;

    const total = tickets.length;

    const resolutionRate = total
        ? Math.round((resolved / total) * 100)
        : 0;

    content.innerHTML = `
        <div class="page-heading">
            <div>
                <h1>Good ${getGreeting()}, ${escapeHTML(
                    (state.user?.name || "there").split(" ")[0]
                )}</h1>

                <p>
                    Here's what's happening with your customer support today.
                </p>
            </div>

            <button class="btn btn-primary" id="createTicketBtn">
                + Create ticket
            </button>
        </div>

        <div class="stats-grid">

            <div class="stat-card">
                <div class="stat-top">
                    <span class="stat-label">Total tickets</span>
                    <span class="stat-icon">▤</span>
                </div>
                <div class="stat-value">${total}</div>
                <div class="stat-change">All recorded tickets</div>
            </div>

            <div class="stat-card">
                <div class="stat-top">
                    <span class="stat-label">Open tickets</span>
                    <span class="stat-icon">◷</span>
                </div>
                <div class="stat-value">${open}</div>
                <div class="stat-change">Awaiting resolution</div>
            </div>

            <div class="stat-card">
                <div class="stat-top">
                    <span class="stat-label">Resolved tickets</span>
                    <span class="stat-icon">✓</span>
                </div>
                <div class="stat-value">${resolved}</div>
                <div class="stat-change">${resolutionRate}% of all tickets</div>
            </div>

            <div class="stat-card">
                <div class="stat-top">
                    <span class="stat-label">High priority</span>
                    <span class="stat-icon">⚑</span>
                </div>
                <div class="stat-value">${urgent}</div>
                <div class="stat-change negative">Requires attention</div>
            </div>

        </div>

        <div class="dashboard-grid">

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>Ticket overview</h3>
                        <p>Distribution of your current tickets</p>
                    </div>

                    <button class="btn btn-small" id="overviewInboxBtn">
                        View inbox →
                    </button>
                </div>

                <div class="chart-container">
                    <canvas id="overviewChart"></canvas>
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>Recent activity</h3>
                        <p>Latest customer conversations</p>
                    </div>
                </div>

                <div class="activity-list">
                    ${renderRecentActivity()}
                </div>
            </div>

        </div>

        <div class="panel">
            <div class="panel-header">
                <div>
                    <h3>Recent tickets</h3>
                    <p>Latest support requests from your customers</p>
                </div>

                <button class="btn btn-small" id="recentTicketsBtn">
                    View all tickets →
                </button>
            </div>

            ${ticketTable(tickets.slice(0, 5))}
        </div>
    `;

    $("#createTicketBtn").addEventListener("click", openCreateTicket);
    $("#overviewInboxBtn").addEventListener("click", () => navigate("inbox"));
    $("#recentTicketsBtn").addEventListener("click", () => navigate("inbox"));

    drawOverviewChart();
}

function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";

    return "evening";
}

function renderRecentActivity() {
    const recent = [...state.tickets]
        .sort((a, b) =>
            new Date(b.updatedAt || b.createdAt) -
            new Date(a.updatedAt || a.createdAt)
        )
        .slice(0, 5);

    if (!recent.length) {
        return `
            <div class="empty-state">
                <h3>No activity yet</h3>
                <p>New ticket activity will appear here.</p>
            </div>
        `;
    }

    return recent.map(ticket => `
        <div class="activity-item">
            <div class="activity-dot"></div>

            <div>
                <p>
                    <b>${escapeHTML(getCustomerName(ticket))}</b>
                    created or updated
                    <b>${escapeHTML(getTicketSubject(ticket))}</b>
                </p>

                <small>${formatDateTime(
                    ticket.updatedAt || ticket.createdAt
                )}</small>
            </div>
        </div>
    `).join("");
}

function drawOverviewChart() {
    const canvas = $("#overviewChart");

    if (!canvas || typeof Chart === "undefined") return;

    const counts = {
        Open: 0,
        Pending: 0,
        Resolved: 0,
        Closed: 0
    };

    state.tickets.forEach(ticket => {
        const status = getTicketStatus(ticket);

        const key = Object.keys(counts).find(
            item => item.toLowerCase() === status.toLowerCase()
        );

        if (key) counts[key]++;
    });

    if (window.nexaOverviewChart) {
        window.nexaOverviewChart.destroy();
    }

    window.nexaOverviewChart = new Chart(canvas, {
        type: "doughnut",

        data: {
            labels: Object.keys(counts),

            datasets: [{
                data: Object.values(counts),
                backgroundColor: [
                    "#4387d9",
                    "#d99a35",
                    "#239b72",
                    "#a4a6b4"
                ],
                borderWidth: 0
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",

            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        padding: 18
                    }
                }
            }
        }
    });
}

/* =====================================================
   REUSABLE TICKET TABLE
   ===================================================== */

function ticketTable(tickets) {
    if (!tickets.length) {
        return `
            <div class="empty-state">
                <h3>No tickets found</h3>
                <p>New support tickets will appear here.</p>
            </div>
        `;
    }

    return `
        <div class="table-wrap">
            <table class="data-table">

                <thead>
                    <tr>
                        <th>TICKET</th>
                        <th>CUSTOMER</th>
                        <th>STATUS</th>
                        <th>PRIORITY</th>
                        <th>ASSIGNED TO</th>
                        <th>CREATED</th>
                        <th>ACTION</th>
                    </tr>
                </thead>

                <tbody>
                    ${tickets.map(ticket => `
                        <tr>
                            <td>
                                <span class="table-primary">
                                    ${escapeHTML(getTicketNumber(ticket))}
                                </span>
                                <span class="table-secondary">
                                    ${escapeHTML(getTicketSubject(ticket))}
                                </span>
                            </td>

                            <td>
                                <span class="table-primary">
                                    ${escapeHTML(getCustomerName(ticket))}
                                </span>
                                <span class="table-secondary">
                                    ${escapeHTML(getCustomerEmail(ticket))}
                                </span>
                            </td>

                            <td>
                                <span class="status ${statusClass(getTicketStatus(ticket))}">
                                    ${escapeHTML(getTicketStatus(ticket))}
                                </span>
                            </td>

                            <td>
                                <span class="priority ${priorityClass(getTicketPriority(ticket))}">
                                    ${escapeHTML(getTicketPriority(ticket))}
                                </span>
                            </td>

                            <td>${escapeHTML(getAgentName(ticket))}</td>

                            <td>${formatDate(ticket.createdAt)}</td>

                            <td>
                                <button
                                    class="btn btn-small"
                                    data-view-ticket="${escapeHTML(getTicketId(ticket))}"
                                >
                                    View
                                </button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>

            </table>
        </div>
    `;
}

/* =====================================================
   TICKET INBOX
   ===================================================== */

function renderInbox() {
    const content = $("#content");

    const filtered = state.tickets.filter(ticket => {
        const search = state.search.toLowerCase();

        return (
            getTicketSubject(ticket).toLowerCase().includes(search) ||
            getCustomerName(ticket).toLowerCase().includes(search) ||
            getCustomerEmail(ticket).toLowerCase().includes(search) ||
            getTicketNumber(ticket).toLowerCase().includes(search)
        );
    });

    content.innerHTML = `
        <div class="page-heading">
            <div>
                <h1>Ticket inbox</h1>
                <p>Manage, assign and resolve customer support requests.</p>
            </div>

            <button class="btn btn-primary" id="createTicketBtn">
                + Create ticket
            </button>
        </div>

        <div class="panel">

            <div class="toolbar">

                <div class="filters">
                    <input
                        class="filter-input"
                        id="ticketSearch"
                        placeholder="Search tickets..."
                        value="${escapeHTML(state.search)}"
                    >

                    <select class="filter-select" id="statusFilter">
                        <option value="all">All statuses</option>
                        <option value="Open">Open</option>
                        <option value="Pending">Pending</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                    </select>

                    <select class="filter-select" id="priorityFilter">
                        <option value="all">All priorities</option>
                        <option value="Urgent">Urgent</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                </div>

                <button class="btn btn-small" id="refreshTickets">
                    ↻ Refresh
                </button>

            </div>

            <div id="ticketTableArea">
                ${ticketTable(filtered)}
            </div>

        </div>
    `;

    $("#createTicketBtn").addEventListener("click", openCreateTicket);

    $("#ticketSearch").addEventListener("input", event => {
        state.search = event.target.value;
        renderInbox();
        const input = $("#ticketSearch");
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    });

    $("#statusFilter").addEventListener("change", applyTicketFilters);
    $("#priorityFilter").addEventListener("change", applyTicketFilters);

    $("#refreshTickets").addEventListener("click", async () => {
        await loadTickets();
        renderInbox();
        notify("Tickets refreshed.");
    });

    applyTicketFilters();
}

function applyTicketFilters() {
    const status = $("#statusFilter")?.value || "all";
    const priority = $("#priorityFilter")?.value || "all";

    let filtered = state.tickets.filter(ticket => {
        const matchesSearch =
            getTicketSubject(ticket).toLowerCase().includes(state.search.toLowerCase()) ||
            getCustomerName(ticket).toLowerCase().includes(state.search.toLowerCase()) ||
            getCustomerEmail(ticket).toLowerCase().includes(state.search.toLowerCase()) ||
            getTicketNumber(ticket).toLowerCase().includes(state.search.toLowerCase());

        const matchesStatus =
            status === "all" ||
            getTicketStatus(ticket).toLowerCase() === status.toLowerCase();

        const matchesPriority =
            priority === "all" ||
            getTicketPriority(ticket).toLowerCase() === priority.toLowerCase();

        return matchesSearch && matchesStatus && matchesPriority;
    });

    const area = $("#ticketTableArea");

    if (area) {
        area.innerHTML = ticketTable(filtered);
    }
}

/* =====================================================
   CREATE TICKET
   ===================================================== */

function openCreateTicket() {
    openModal(`
        <div class="modal-header">
            <h2>Create new ticket</h2>
            <button class="modal-close" data-close-modal>×</button>
        </div>

        <form id="createTicketForm" class="modal-form">

            <div class="form-group">
                <label>Customer name</label>
                <input name="customerName" required placeholder="Customer name">
            </div>

            <div class="form-group">
                <label>Customer email</label>
                <input name="customerEmail" type="email" required placeholder="customer@email.com">
            </div>

            <div class="form-group">
                <label>Ticket subject</label>
                <input name="subject" required placeholder="Enter ticket subject">
            </div>

            <div class="form-group">
                <label>Description</label>
                <textarea name="description" rows="4" required placeholder="Describe the customer's issue"></textarea>
            </div>

            <div class="form-group">
                <label>Priority</label>
                <select name="priority">
                    <option>Low</option>
                    <option selected>Medium</option>
                    <option>High</option>
                    <option>Urgent</option>
                </select>
            </div>

            <div class="modal-actions">
                <button type="button" class="btn" data-close-modal>Cancel</button>
                <button type="submit" class="btn btn-primary">Create ticket</button>
            </div>

        </form>
    `);

    $("#createTicketForm").addEventListener("submit", createTicket);
}

async function createTicket(event) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    const payload = {
        customerName: form.get("customerName"),
        customerEmail: form.get("customerEmail"),
        subject: form.get("subject"),
        description: form.get("description"),
        priority: form.get("priority")
    };

    try {
        await api("/tickets", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        closeModal();
        await loadTickets();
        renderPage(state.currentPage);

        notify("Ticket created successfully.");

    } catch (error) {
        notify(error.message, "error");
    }
}

/* =====================================================
   VIEW TICKET AND REPLIES
   ===================================================== */

async function viewTicket(id) {
    try {
        const result = await api(`/tickets/${encodeURIComponent(id)}`);

        const ticket = result.ticket || result;

        openModal(`
            <div class="modal-header">
                <h2>${escapeHTML(getTicketNumber(ticket))}</h2>
                <button class="modal-close" data-close-modal>×</button>
            </div>

            <h3>${escapeHTML(getTicketSubject(ticket))}</h3>

            <p class="text-muted mt-10">
                ${escapeHTML(getCustomerName(ticket))}
                · ${escapeHTML(getCustomerEmail(ticket))}
            </p>

            <div class="flex gap-10 mt-20">
                <span class="status ${statusClass(getTicketStatus(ticket))}">
                    ${escapeHTML(getTicketStatus(ticket))}
                </span>

                <span class="priority ${priorityClass(getTicketPriority(ticket))}">
                    ${escapeHTML(getTicketPriority(ticket))}
                </span>
            </div>

            <div class="settings-section">
                <h4>Description</h4>
                <p>${escapeHTML(ticket.description || "No description provided.")}</p>
            </div>

            <div class="settings-section">
                <h4>Assigned to</h4>
                <p>${escapeHTML(getAgentName(ticket))}</p>
            </div>

            <div class="settings-section">
                <h4>Update status</h4>

                <select id="ticketStatusUpdate" class="filter-select w-full">
                    ${["Open", "Pending", "Resolved", "Closed"].map(status => `
                        <option
                            value="${status}"
                            ${getTicketStatus(ticket).toLowerCase() === status.toLowerCase() ? "selected" : ""}
                        >
                            ${status}
                        </option>
                    `).join("")}
                </select>

                <button class="btn btn-primary btn-small mt-10" id="saveTicketStatus">
                    Save status
                </button>
            </div>

            <div class="settings-section">
                <h4>Reply to customer</h4>

                <form id="replyForm" class="modal-form">
                    <textarea
                        name="message"
                        rows="3"
                        required
                        placeholder="Write a reply..."
                    ></textarea>

                    <button class="btn btn-primary" type="submit">
                        Send reply
                    </button>
                </form>
            </div>

            <div class="modal-actions">
                <button class="btn" data-close-modal>Close</button>
            </div>
        `);

        $("#saveTicketStatus").addEventListener("click", async () => {
            const status = $("#ticketStatusUpdate").value;

            try {
                await api(`/tickets/${encodeURIComponent(id)}`, {
                    method: "PATCH",
                    body: JSON.stringify({ status })
                });

                await loadTickets();
                closeModal();
                renderPage(state.currentPage);
                notify("Ticket status updated.");

            } catch (error) {
                notify(error.message, "error");
            }
        });

        $("#replyForm").addEventListener("submit", async event => {
            event.preventDefault();

            const form = new FormData(event.currentTarget);

            try {
                await api(`/tickets/${encodeURIComponent(id)}/replies`, {
                    method: "POST",
                    body: JSON.stringify({
                        message: form.get("message")
                    })
                });

                notify("Reply submitted.");
                closeModal();
                await loadTickets();
                renderPage(state.currentPage);

            } catch (error) {
                notify(error.message, "error");
            }
        });

    } catch (error) {
        notify(error.message, "error");
    }
}

/* =====================================================
   CUSTOMERS
   ===================================================== */

function renderCustomers() {
    const content = $("#content");

    const customersMap = new Map();

    state.tickets.forEach(ticket => {
        const email = getCustomerEmail(ticket).toLowerCase();

        if (!email) return;

        if (!customersMap.has(email)) {
            customersMap.set(email, {
                name: getCustomerName(ticket),
                email,
                tickets: 0,
                lastActivity: ticket.updatedAt || ticket.createdAt
            });
        }

        const customer = customersMap.get(email);
        customer.tickets++;

        const activity = ticket.updatedAt || ticket.createdAt;

        if (new Date(activity) > new Date(customer.lastActivity)) {
            customer.lastActivity = activity;
        }
    });

    const customers = [...customersMap.values()];

    content.innerHTML = `
        <div class="page-heading">
            <div>
                <h1>Customers</h1>
                <p>View customers and their support history.</p>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total customers</div>
                <div class="stat-value">${customers.length}</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Total tickets</div>
                <div class="stat-value">${state.tickets.length}</div>
            </div>
        </div>

        <div class="panel">
            <div class="toolbar">
                <h3 class="section-title">Customer directory</h3>

                <input
                    class="filter-input"
                    id="customerSearch"
                    placeholder="Search customers..."
                >
            </div>

            <div id="customerTable">
                ${customerTable(customers)}
            </div>
        </div>
    `;

    $("#customerSearch").addEventListener("input", event => {
        const term = event.target.value.toLowerCase();

        const filtered = customers.filter(customer =>
            customer.name.toLowerCase().includes(term) ||
            customer.email.includes(term)
        );

        $("#customerTable").innerHTML = customerTable(filtered);
    });
}

function customerTable(customers) {
    if (!customers.length) {
        return `
            <div class="empty-state">
                <h3>No customers found</h3>
                <p>Customers are listed when they have a support ticket.</p>
            </div>
        `;
    }

    return `
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>CUSTOMER</th>
                        <th>EMAIL</th>
                        <th>TOTAL TICKETS</th>
                        <th>LAST ACTIVITY</th>
                        <th>ACTION</th>
                    </tr>
                </thead>

                <tbody>
                    ${customers.map(customer => `
                        <tr>
                            <td>
                                <div class="person-cell">
                                    <div class="person-avatar">
                                        ${escapeHTML(initials(customer.name))}
                                    </div>

                                    <span class="table-primary">
                                        ${escapeHTML(customer.name)}
                                    </span>
                                </div>
                            </td>

                            <td>${escapeHTML(customer.email)}</td>
                            <td>${customer.tickets}</td>
                            <td>${formatDate(customer.lastActivity)}</td>

                            <td>
                                <button
                                    class="btn btn-small"
                                    data-customer-email="${escapeHTML(customer.email)}"
                                >
                                    History
                                </button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function showCustomerHistory(email) {
    const tickets = state.tickets.filter(ticket =>
        getCustomerEmail(ticket).toLowerCase() === email.toLowerCase()
    );

    openModal(`
        <div class="modal-header">
            <h2>Customer history</h2>
            <button class="modal-close" data-close-modal>×</button>
        </div>

        ${ticketTable(tickets)}
    `);
}

/* =====================================================
   KNOWLEDGE BASE
   ===================================================== */

function renderKnowledge() {
    const content = $("#content");

    content.innerHTML = `
        <div class="page-heading">
            <div>
                <h1>Knowledge base</h1>
                <p>Manage support articles and trusted information for AI answers.</p>
            </div>

            <button class="btn btn-primary" id="addKnowledgeBtn">
                + Add article
            </button>
        </div>

        <div class="toolbar">
            <input
                class="filter-input"
                id="knowledgeSearch"
                placeholder="Search articles..."
            >
        </div>

        <div id="knowledgeGrid" class="knowledge-grid">
            ${knowledgeCards(state.knowledge)}
        </div>
    `;

    $("#addKnowledgeBtn").addEventListener("click", openCreateKnowledge);

    $("#knowledgeSearch").addEventListener("input", event => {
        const term = event.target.value.toLowerCase();

        const filtered = state.knowledge.filter(item =>
            `${item.title || ""} ${item.content || ""} ${item.category || ""}`
                .toLowerCase()
                .includes(term)
        );

        $("#knowledgeGrid").innerHTML = knowledgeCards(filtered);
    });
}

function knowledgeCards(items) {
    if (!items.length) {
        return `
            <div class="empty-state">
                <h3>No knowledge articles yet</h3>
                <p>Create articles to help the support team answer customer questions.</p>
            </div>
        `;
    }

    return items.map(item => `
        <article class="knowledge-card">

            <div class="knowledge-icon">▧</div>

            <h3>${escapeHTML(item.title || "Untitled article")}</h3>

            <p>
                ${escapeHTML((item.content || item.body || "").slice(0, 150))}
                ${(item.content || item.body || "").length > 150 ? "..." : ""}
            </p>

            <div class="knowledge-meta">
                <span>${escapeHTML(item.category || "General")}</span>

                <button
                    class="btn btn-small"
                    data-delete-knowledge="${escapeHTML(item._id || item.id)}"
                >
                    Delete
                </button>
            </div>

        </article>
    `).join("");
}

function openCreateKnowledge() {
    openModal(`
        <div class="modal-header">
            <h2>Add knowledge article</h2>
            <button class="modal-close" data-close-modal>×</button>
        </div>

        <form id="knowledgeForm" class="modal-form">

            <div class="form-group">
                <label>Article title</label>
                <input name="title" required>
            </div>

            <div class="form-group">
                <label>Category</label>
                <input name="category" placeholder="Billing, Orders, Returns...">
            </div>

            <div class="form-group">
                <label>Article content</label>
                <textarea name="content" rows="7" required></textarea>
            </div>

            <div class="modal-actions">
                <button type="button" class="btn" data-close-modal>Cancel</button>
                <button type="submit" class="btn btn-primary">Save article</button>
            </div>

        </form>
    `);

    $("#knowledgeForm").addEventListener("submit", async event => {
        event.preventDefault();

        const form = new FormData(event.currentTarget);

        try {
            await api("/knowledge", {
                method: "POST",
                body: JSON.stringify({
                    title: form.get("title"),
                    category: form.get("category"),
                    content: form.get("content")
                })
            });

            await loadKnowledge();
            closeModal();
            renderKnowledge();

            notify("Knowledge article added.");

        } catch (error) {
            notify(error.message, "error");
        }
    });
}

async function deleteKnowledge(id) {
    if (!confirm("Delete this knowledge article?")) return;

    try {
        await api(`/knowledge/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        await loadKnowledge();
        renderKnowledge();

        notify("Article deleted.");

    } catch (error) {
        notify(error.message, "error");
    }
}

/* =====================================================
   AI ASSISTANT
   ===================================================== */

function renderAssistant() {
    const content = $("#content");

    content.innerHTML = `
        <div class="page-heading">
            <div>
                <h1>AI assistant</h1>
                <p>Get support suggestions grounded in your knowledge base.</p>
            </div>
        </div>

        <div class="assistant-layout">

            <div class="chat-panel">

                <div class="chat-header">
                    <div class="ai-icon">✳</div>

                    <div>
                        <b>NexaDesk AI</b>
                        <small>Support assistant</small>
                    </div>
                </div>

                <div class="chat-messages" id="chatMessages">

                    <div class="chat-message assistant">
                        Hello! I'm NexaDesk AI. Ask me a question about
                        your support knowledge base, policies or customer issues.
                    </div>

                </div>

                <form class="chat-input-area" id="assistantForm">
                    <input
                        id="assistantQuestion"
                        placeholder="Ask a support question..."
                        autocomplete="off"
                        required
                    >

                    <button type="submit">Send</button>
                </form>

            </div>

            <aside class="assistant-side">
                <h3>Suggested questions</h3>

                <button class="suggestion" data-question="How do I process a customer refund?">
                    How do I process a refund?
                </button>

                <button class="suggestion" data-question="What is the return policy?">
                    What is the return policy?
                </button>

                <button class="suggestion" data-question="How should I handle a delayed order?">
                    How do I handle a delayed order?
                </button>

                <button class="suggestion" data-question="What should I do when a customer is unhappy?">
                    How do I handle an unhappy customer?
                </button>
            </aside>

        </div>
    `;

    $("#assistantForm").addEventListener("submit", askAssistant);

    document.querySelectorAll("[data-question]").forEach(button => {
        button.addEventListener("click", () => {
            $("#assistantQuestion").value = button.dataset.question;
            $("#assistantForm").requestSubmit();
        });
    });
}

function appendChatMessage(message, sender) {
    const messages = $("#chatMessages");

    const bubble = document.createElement("div");
    bubble.className = `chat-message ${sender}`;
    bubble.textContent = message;

    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;

    return bubble;
}

async function askAssistant(event) {
    event.preventDefault();

    const input = $("#assistantQuestion");
    const question = input.value.trim();

    if (!question) return;

    appendChatMessage(question, "user");
    input.value = "";

    const loading = appendChatMessage("Thinking...", "assistant");

    try {
        const result = await api("/knowledge/ask", {
            method: "POST",
            body: JSON.stringify({ question })
        });

        const answer =
            result.answer ||
            result.response ||
            result.message ||
            "I could not find a suitable answer in the knowledge base.";

        loading.textContent = answer;

    } catch (error) {
        loading.textContent = `I couldn't complete that request: ${error.message}`;
    }
}

/* =====================================================
   ANALYTICS
   ===================================================== */

function renderAnalytics() {
    const content = $("#content");

    const tickets = state.tickets;

    const statuses = ["Open", "Pending", "Resolved", "Closed"];

    const statusCounts = statuses.map(status =>
        tickets.filter(ticket =>
            getTicketStatus(ticket).toLowerCase() === status.toLowerCase()
        ).length
    );

    const priorities = ["Urgent", "High", "Medium", "Low"];

    const priorityCounts = priorities.map(priority =>
        tickets.filter(ticket =>
            getTicketPriority(ticket).toLowerCase() === priority.toLowerCase()
        ).length
    );

    const resolved = tickets.filter(ticket =>
        ["resolved", "closed"].includes(getTicketStatus(ticket).toLowerCase())
    ).length;

    const rate = tickets.length
        ? Math.round(resolved / tickets.length * 100)
        : 0;

    content.innerHTML = `
        <div class="page-heading">
            <div>
                <h1>Analytics</h1>
                <p>Understand support workload and ticket performance.</p>
            </div>

            <button class="btn btn-primary" id="exportAnalytics">
                ↓ Export CSV
            </button>
        </div>

        <div class="stats-grid">

            <div class="stat-card">
                <div class="stat-label">Total tickets</div>
                <div class="stat-value">${tickets.length}</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Resolved tickets</div>
                <div class="stat-value">${resolved}</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Resolution rate</div>
                <div class="stat-value">${rate}%</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">High / urgent tickets</div>
                <div class="stat-value">
                    ${priorityCounts[0] + priorityCounts[1]}
                </div>
            </div>

        </div>

        <div class="analytics-grid">

            <div class="analytics-card">
                <div class="panel-header">
                    <h3>Tickets by status</h3>
                </div>

                <div class="chart-container">
                    <canvas id="statusChart"></canvas>
                </div>
            </div>

            <div class="analytics-card">
                <div class="panel-header">
                    <h3>Tickets by priority</h3>
                </div>

                <div class="chart-container">
                    <canvas id="priorityChart"></canvas>
                </div>
            </div>

        </div>
    `;

    drawAnalyticsChart(
        "statusChart",
        statuses,
        statusCounts,
        "bar"
    );

    drawAnalyticsChart(
        "priorityChart",
        priorities,
        priorityCounts,
        "doughnut"
    );

    $("#exportAnalytics").addEventListener("click", exportTicketsCSV);
}

function drawAnalyticsChart(id, labels, values, type) {
    const canvas = $(`#${id}`);

    if (!canvas || typeof Chart === "undefined") return;

    const key = `nexa_${id}`;

    if (window[key]) {
        window[key].destroy();
    }

    window[key] = new Chart(canvas, {
        type,

        data: {
            labels,

            datasets: [{
                label: "Tickets",
                data: values,
                backgroundColor: [
                    "#4387d9",
                    "#d99a35",
                    "#239b72",
                    "#a4a6b4"
                ],
                borderWidth: 0,
                borderRadius: 6
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: type === "doughnut" ? "bottom" : "top"
                }
            },

            scales: type === "bar" ? {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            } : {}
        }
    });
}

function exportTicketsCSV() {
    const columns = [
        "Ticket Number",
        "Subject",
        "Customer",
        "Email",
        "Status",
        "Priority",
        "Assigned To",
        "Created At"
    ];

    const rows = state.tickets.map(ticket => [
        getTicketNumber(ticket),
        getTicketSubject(ticket),
        getCustomerName(ticket),
        getCustomerEmail(ticket),
        getTicketStatus(ticket),
        getTicketPriority(ticket),
        getAgentName(ticket),
        formatDate(ticket.createdAt)
    ]);

    const csv = [
        columns,
        ...rows
    ].map(row =>
        row.map(value =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
        ).join(",")
    ).join("\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "nexadesk-ticket-analytics.csv";
    link.click();

    URL.revokeObjectURL(url);

    notify("CSV report exported.");
}

/* =====================================================
   TEAM MANAGEMENT
   ===================================================== */

async function renderTeam() {
    const content = $("#content");

    content.innerHTML = `
        <div class="loading-state">Loading team members...</div>
    `;

    try {
        await loadTeam();

        content.innerHTML = `
            <div class="page-heading">
                <div>
                    <h1>Team & agents</h1>
                    <p>View your support team and their account roles.</p>
                </div>
            </div>

            <div class="panel">
                ${teamTable(state.team)}
            </div>
        `;

    } catch (error) {
        content.innerHTML = `
            <div class="panel empty-state">
                <h3>Team information unavailable</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
}

function teamTable(users) {
    if (!users.length) {
        return `
            <div class="empty-state">
                <h3>No team members found</h3>
                <p>Team accounts will appear here.</p>
            </div>
        `;
    }

    return `
        <div class="table-wrap">
            <table class="data-table">

                <thead>
                    <tr>
                        <th>TEAM MEMBER</th>
                        <th>EMAIL</th>
                        <th>ROLE</th>
                        <th>STATUS</th>
                    </tr>
                </thead>

                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>
                                <div class="person-cell">
                                    <div class="person-avatar">
                                        ${escapeHTML(initials(user.name))}
                                    </div>

                                    <span class="table-primary">
                                        ${escapeHTML(user.name || "User")}
                                    </span>
                                </div>
                            </td>

                            <td>${escapeHTML(user.email || "")}</td>

                            <td>
                                <span class="role-badge status-open">
                                    ${escapeHTML(user.role || "Agent")}
                                </span>
                            </td>

                            <td>
                                <span class="status status-resolved">
                                    ${user.active === false ? "Inactive" : "Active"}
                                </span>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>

            </table>
        </div>
    `;
}

/* =====================================================
   SETTINGS
   ===================================================== */

function renderSettings() {
    const content = $("#content");
    const user = state.user || {};

    content.innerHTML = `
        <div class="page-heading">
            <div>
                <h1>Settings</h1>
                <p>Manage your profile and application preferences.</p>
            </div>
        </div>

        <div class="settings-layout">

            <div class="settings-nav">
                <button class="active">General</button>
                <button>Profile</button>
                <button>Preferences</button>
                <button id="logoutSettings">Sign out</button>
            </div>

            <div class="settings-content">

                <h3>Account information</h3>

                <form id="profileForm" class="modal-form">

                    <div class="form-group">
                        <label>Full name</label>
                        <input
                            name="name"
                            value="${escapeHTML(user.name || "")}"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label>Email address</label>
                        <input
                            value="${escapeHTML(user.email || "")}"
                            disabled
                        >
                    </div>

                    <div class="form-group">
                        <label>Role</label>
                        <input
                            value="${escapeHTML(user.role || "Agent")}"
                            disabled
                        >
                    </div>

                    <button class="btn btn-primary" type="submit">
                        Save profile
                    </button>

                </form>

                <div class="settings-section">
                    <h4>Application</h4>
                    <p>
                        NexaDesk is connected to its Node.js API and MongoDB database.
                    </p>
                </div>

                <div class="settings-section">
                    <h4>Session</h4>
                    <p>Sign out of your NexaDesk account on this device.</p>

                    <button class="btn btn-danger mt-10" id="logoutButton">
                        Sign out
                    </button>
                </div>

            </div>

        </div>
    `;

    $("#profileForm").addEventListener("submit", async event => {
        event.preventDefault();

        const form = new FormData(event.currentTarget);

        try {
            const result = await api("/auth/profile", {
                method: "PATCH",
                body: JSON.stringify({
                    name: form.get("name")
                })
            });

            state.user = result.user || result;
            updateProfile();

            notify("Profile updated.");

        } catch (error) {
            notify(error.message, "error");
        }
    });

    $("#logoutButton").addEventListener("click", () => logout());
    $("#logoutSettings").addEventListener("click", () => logout());
}

/* =====================================================
   MODAL HELPERS
   ===================================================== */

function openModal(html) {
    const backdrop = $("#modalBackdrop");
    const modal = $("#modal");

    if (!backdrop || !modal) return;

    modal.innerHTML = html;
    backdrop.classList.remove("hidden");

    modal.querySelectorAll("[data-close-modal]").forEach(button => {
        button.addEventListener("click", closeModal);
    });
}

function closeModal() {
    const backdrop = $("#modalBackdrop");

    if (backdrop) {
        backdrop.classList.add("hidden");
    }
}

/* =====================================================
   GLOBAL EVENT HANDLERS
   ===================================================== */

function bindGlobalEvents() {

    $("#mainNav")?.addEventListener("click", event => {
        const button = event.target.closest("[data-page]");

        if (!button) return;

        navigate(button.dataset.page);
    });

    $("#content")?.addEventListener("click", event => {

        const viewButton = event.target.closest("[data-view-ticket]");

        if (viewButton) {
            viewTicket(viewButton.dataset.viewTicket);
            return;
        }

        const customerButton = event.target.closest("[data-customer-email]");

        if (customerButton) {
            showCustomerHistory(customerButton.dataset.customerEmail);
            return;
        }

        const deleteButton = event.target.closest("[data-delete-knowledge]");

        if (deleteButton) {
            deleteKnowledge(deleteButton.dataset.deleteKnowledge);
        }
    });

    $("#mobileMenu")?.addEventListener("click", () => {
        $("#sidebar")?.classList.toggle("open");
    });

    $("#modalBackdrop")?.addEventListener("click", event => {
        if (event.target.id === "modalBackdrop") {
            closeModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal();
        }

        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            $("#globalSearch")?.focus();
        }
    });

    $("#globalSearch")?.addEventListener("input", event => {
        state.search = event.target.value;

        if (state.currentPage !== "inbox") {
            navigate("inbox");
        } else {
            renderInbox();
        }
    });

    $("#notificationBtn")?.addEventListener("click", () => {
        openModal(`
            <div class="modal-header">
                <h2>Notifications</h2>
                <button class="modal-close" data-close-modal>×</button>
            </div>

            <div class="empty-state">
                <h3>You're all caught up</h3>
                <p>New support notifications will appear here.</p>
            </div>
        `);
    });

    $("#profileMenu")?.addEventListener("click", () => {
        openProfileMenu();
    });

    $("#topProfile")?.addEventListener("click", () => {
        openProfileMenu();
    });

    $("#helpBtn")?.addEventListener("click", () => {
        openModal(`
            <div class="modal-header">
                <h2>NexaDesk help center</h2>
                <button class="modal-close" data-close-modal>×</button>
            </div>

            <p class="text-muted">
                Use the ticket inbox to manage customer issues,
                the knowledge base to store support information,
                and the AI assistant to find answers.
            </p>

            <div class="modal-actions">
                <button class="btn btn-primary" data-close-modal>
                    Got it
                </button>
            </div>
        `);
    });
}

function openProfileMenu() {
    openModal(`
        <div class="modal-header">
            <h2>Account</h2>
            <button class="modal-close" data-close-modal>×</button>
        </div>

        <div class="person-cell">
            <div class="person-avatar">
                ${escapeHTML(initials(state.user?.name || "User"))}
            </div>

            <div class="person-info">
                <b>${escapeHTML(state.user?.name || "User")}</b>
                <small>${escapeHTML(state.user?.email || "")}</small>
            </div>
        </div>

        <div class="settings-section">
            <p>Role: ${escapeHTML(state.user?.role || "Agent")}</p>
        </div>

        <div class="modal-actions">
            <button class="btn" id="profileSettingsBtn">
                Settings
            </button>

            <button class="btn btn-danger" id="profileLogoutBtn">
                Sign out
            </button>
        </div>
    `);

    $("#profileSettingsBtn").addEventListener("click", () => {
        closeModal();
        navigate("settings");
    });

    $("#profileLogoutBtn").addEventListener("click", () => {
        closeModal();
        logout();
    });
}

/* =====================================================
   APPLICATION INITIALIZATION
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    bindGlobalEvents();

    if (state.token) {
        startApplication();
    } else {
        showLogin();
    }
});
