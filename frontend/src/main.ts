import "./style.css";
import type { Task } from "./types";
import {
  ApiError,
  createTask,
  deleteTask,
  isAuthenticated,
  listTasks,
  login,
  logout,
  register,
  updateTask,
} from "./api";

const app = document.querySelector<HTMLDivElement>("#app")!;

let tasks: Task[] = [];
let authView: "login" | "register" = "login";
let authError = "";
let taskError = "";

async function refreshTasks(): Promise<void> {
  try {
    tasks = await listTasks();
    taskError = "";
  } catch (err) {
    taskError = err instanceof ApiError ? err.message : "Failed to load tasks.";
  }
  render();
}

function renderAuth(): string {
  const isLogin = authView === "login";

  const formHtml = isLogin
    ? `
      <form id="login-form">
        <h2>Login</h2>
        <input name="username" placeholder="Username" required />
        <input name="password" type="password" placeholder="Password" required />
        <button type="submit">Login</button>
      </form>
    `
    : `
      <form id="register-form">
        <h2>Register</h2>
        <input name="username" placeholder="Username" required />
        <input name="email" type="email" placeholder="Email" />
        <input name="password" type="password" placeholder="Password (min 8 chars)" required minlength="8" />
        <button type="submit">Register</button>
      </form>
    `;

  const switchHtml = isLogin
    ? `<p class="auth-switch">No account yet? <button type="button" id="switch-auth" class="link">Register</button></p>`
    : `<p class="auth-switch">Already have an account? <button type="button" id="switch-auth" class="link">Login</button></p>`;

  return `
    <div class="auth-card">
      <h1>Task Manager</h1>
      ${formHtml}
      ${authError ? `<p class="error">${authError}</p>` : ""}
      ${switchHtml}
    </div>
  `;
}

function renderTasks(): string {
  const items = tasks
    .map(
      (task) => `
        <li class="task ${task.completed ? "completed" : ""}" data-id="${task.id}">
          <label>
            <input type="checkbox" class="toggle" ${task.completed ? "checked" : ""} />
            <strong>${escapeHtml(task.title)}</strong>
          </label>
          <p>${escapeHtml(task.description)}</p>
          <div class="actions">
            <button class="edit">Edit</button>
            <button class="delete">Delete</button>
          </div>
        </li>
      `
    )
    .join("");

  return `
    <div class="board">
      <header>
        <h1>My Tasks</h1>
        <button id="logout">Logout</button>
      </header>
      <form id="add-form">
        <input name="title" placeholder="Task title" required />
        <input name="description" placeholder="Description (optional)" />
        <button type="submit">Add task</button>
      </form>
      ${taskError ? `<p class="error">${taskError}</p>` : ""}
      <ul class="task-list">${items || "<li class='empty'>No tasks yet.</li>"}</ul>
    </div>
  `;
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function render(): void {
  app.innerHTML = isAuthenticated() ? renderTasks() : renderAuth();
  attachHandlers();
}

function attachHandlers(): void {
  if (!isAuthenticated()) {
    document.querySelector("#switch-auth")!.addEventListener("click", () => {
      authView = authView === "login" ? "register" : "login";
      authError = "";
      render();
    });

    const loginForm = document.querySelector<HTMLFormElement>("#login-form");
    loginForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(loginForm);
      try {
        await login(String(data.get("username")), String(data.get("password")));
        authError = "";
        await refreshTasks();
      } catch (err) {
        authError = err instanceof ApiError ? err.message : "Login failed.";
        render();
      }
    });

    const registerForm = document.querySelector<HTMLFormElement>("#register-form");
    registerForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(registerForm);
      try {
        await register(String(data.get("username")), String(data.get("email")), String(data.get("password")));
        await login(String(data.get("username")), String(data.get("password")));
        authError = "";
        await refreshTasks();
      } catch (err) {
        authError = err instanceof ApiError ? err.message : "Registration failed.";
        render();
      }
    });
    return;
  }

  document.querySelector("#logout")!.addEventListener("click", () => {
    logout();
    tasks = [];
    render();
  });

  const addForm = document.querySelector<HTMLFormElement>("#add-form")!;
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(addForm);
    const title = String(data.get("title")).trim();
    if (!title) return;
    try {
      await createTask(title, String(data.get("description") ?? ""));
      addForm.reset();
      await refreshTasks();
    } catch (err) {
      taskError = err instanceof ApiError ? err.message : "Failed to add task.";
      render();
    }
  });

  document.querySelectorAll<HTMLLIElement>(".task").forEach((item) => {
    const id = Number(item.dataset.id);
    const task = tasks.find((t) => t.id === id)!;

    item.querySelector(".toggle")!.addEventListener("change", async () => {
      await updateTask(id, { completed: !task.completed });
      await refreshTasks();
    });

    item.querySelector(".edit")!.addEventListener("click", async () => {
      const newTitle = window.prompt("Edit title", task.title);
      if (newTitle === null) return;
      const newDescription = window.prompt("Edit description", task.description) ?? task.description;
      await updateTask(id, { title: newTitle, description: newDescription });
      await refreshTasks();
    });

    item.querySelector(".delete")!.addEventListener("click", async () => {
      if (!window.confirm("Delete this task?")) return;
      await deleteTask(id);
      await refreshTasks();
    });
  });
}

if (isAuthenticated()) {
  refreshTasks();
} else {
  render();
}
