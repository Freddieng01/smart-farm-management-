# 🌾 Smart Farm Management System (SFMS)
## Core Foundation Documentation (Modules 1, 8, 18, 21)

**Version:** 1.0  
**Status:** Finalized & Verified  

---

## 1. Project Overview
The Smart Farm Management System (SFMS) is a comprehensive enterprise solution designed to digitize farm operations. The **Core Foundation** phase establishes the essential infrastructure required for all other modules. It provides a secure authentication layer, a role-based access control system, and the primary registries for the physical and human resources of the farm.

### Core Modules implemented:
- **Module 21: Security & User Management** (The Gatekeeper)
- **Module 1: Farm & Field Management** (The Physical Map)
- **Module 8: Labour & Employee Management** (The Workforce)
- **Module 18: Farm Dashboard & Analytics** (The Command Center)

---

## 2. Technical Architecture

### 2.1 Technology Stack
- **Frontend**: React.js with Tailwind CSS for a modern, responsive administrative interface.
- **Backend**: Laravel 11 (PHP) providing a robust RESTful API.
- **Authentication**: Laravel Sanctum (Token-based authentication).
- **Database**: MySQL (Relational database for structured farm data).

### 2.2 System Flow
The system follows a decoupled architecture:
1.  **Client (React)** $\rightarrow$ Sends HTTP requests with a Bearer Token.
2.  **Middleware (Laravel)** $\rightarrow$ Validates the token and checks the user's Role (Admin, Manager, etc.).
3.  **Controller (Laravel)** $\rightarrow$ Processes business logic and interacts with the Database.
4.  **Database (MySQL)** $\rightarrow$ Stores and retrieves persistent records.

---

## 3. Module Details

### 3.1 Module 21: Security & User Management
This module ensures that only authorized personnel can access the system and that they can only perform actions allowed by their role.

- **Authentication**: Secure login/logout flow.
- **RBAC (Role-Based Access Control)**: Implements a strict hierarchy:
    - **Admin**: Full system access, including user creation and deletion.
    - **Manager/Agronomist/Accountant/Worker**: Restricted access to specific modules.
- **User Management**: Administrators invite users by email; invited users choose their own password through a one-time setup link.
- **Protected Routes**: Frontend components that prevent unauthorized users from accessing sensitive pages.

### 3.2 Module 1: Farm & Field Management
This module digitizes the physical assets of the farm.

- **Farm Registry**: Ability to register multiple farm locations with GPS coordinates and total acreage.
- **Field Plotting**: A nested relationship allowing each farm to contain multiple fields (plots).
- **Soil Data**: Tracking of soil types and conditions per field to assist in crop planning.
- **Management UI**: Full CRUD (Create, Read, Update, Delete) interface for both farms and fields.

### 3.3 Module 8: Labour & Employee Management
This module manages the human capital of the farm.

- **Employee Assignments**: Links a system `User` to a specific `Farm`.
- **Role Assignment**: Defines the worker's specific job (e.g., Irrigation Operator, Harvester).
- **Compensation Tracking**: Management of hourly pay rates per employee.
- **Workforce UI**: A centralized table to manage worker assignments across different farms.

### 3.4 Module 18: Farm Dashboard & Analytics
The "Command Center" that aggregates data from all other modules into a single view.

- **Infrastructure Metrics**: Real-time counts of total farms, fields, and active users.
- **Financial Intelligence**: 
    - **Total Expenses**: Sum of all recorded farm costs.
    - **Labour Costs**: Dynamic calculation of total wages paid based on hours worked.
- **Production Metrics**: Aggregated totals of crop quantities harvested.
- **Dynamic Navigation**: A "Quick Actions" menu that changes based on the logged-in user's role.

---

## 4. API Reference (Developer's Guide)

| Endpoint | Method | Role | Description |
| :--- | :---: | :---: | :--- |
| `/api/login` | `POST` | Public | Authenticates user and returns Bearer Token. |
| `/api/users` | `GET/PUT/DEL` | Admin | View, edit, and delete system user accounts. |
| `/api/users/invitations` | `POST` | Admin | Sends a seven-day, one-time account setup invitation. |
| `/api/invitations/{token}` | `GET` | Public | Validates an invitation link. |
| `/api/invitations/accept` | `POST` | Public | Creates the invited user's account with their chosen password. |
| `/api/farms` | `GET/POST/PUT/DEL` | Admin/Mgr | Manage farm profiles and locations. |
| `/api/farms/{id}/fields` | `GET/POST/PUT/DEL` | Admin/Mgr | Manage specific plots within a farm. |
| `/api/employees` | `GET/POST/PUT/DEL` | Admin/Mgr | Assign users to farms and set pay rates. |
| `/api/daily-tasks` | `GET/POST/PUT/DEL` | All | Log daily work hours and status. |
| `/api/crop-productions` | `GET/POST/PUT/DEL` | All | Record harvest quantities and quality. |
| `/api/farm-expenses` | `GET/POST/PUT/DEL` | Admin/Acc | Log costs for seeds, labour, and tools. |
| `/api/dashboard/summary` | `GET` | All | Aggregated metrics for the main dashboard. |

---

## 5. Installation & Setup

1.  **Backend**:
    - Install dependencies: `composer install`
    - Configure `.env` with database credentials.
    - Run migrations: `php artisan migrate`
    - Start the API server: `php artisan serve --host=127.0.0.1 --port=8000`
2.  **Frontend**:
    - Install dependencies: `npm install`
    - Start development server: `npm run dev`

Run both servers during local development: Laravel on `127.0.0.1:8000` and Vite on `localhost:5173`. Vite proxies `/api/*` requests to the Laravel API.

### Email invitations

The default `MAIL_MAILER=log` setting writes invitation emails to Laravel's log and does **not** deliver them. Configure an SMTP provider in `.env` before inviting users:

```env
MAIL_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-gmail-address@gmail.com
MAIL_PASSWORD=your-16-character-gmail-app-password
MAIL_FROM_ADDRESS=your-gmail-address@gmail.com
MAIL_FROM_NAME="Smart Farm Management"
FRONTEND_URL=https://your-public-app.example
```

For Gmail, enable two-step verification and create an app password for `MAIL_PASSWORD`; a regular Gmail account password will not work. The `POST /api/users/invitations` route is restricted to authenticated administrators and sends the role-specific invitation email.

`FRONTEND_URL` must be the public URL recipients can open, not `localhost` or the Vite development URL. Each invitation is valid for seven days and can be used once.

---

## 6. Hand-off Notes for Team Members
All future modules (Livestock, Sales, Inventory, etc.) should follow these rules:
1.  **API**: Use the `apiResource` pattern in `routes/api.php` inside the `auth:sanctum` group.
2.  **Frontend**: Use the `api` instance from `AuthContext.jsx` to ensure tokens are sent with every request.
3.  **Security**: Wrap new pages in `<ProtectedRoute>` and use the `role` middleware for sensitive API endpoints.
4.  **UI**: Use the established Tailwind CSS color palette (`#315f2b` for primary) to maintain visual consistency.
