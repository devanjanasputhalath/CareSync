# CareSync 🩺

**CareSync** is a healthcare appointment booking web application designed to make scheduling doctor appointments simpler and more convenient. It combines a web-based interface with a Node.js and Express backend and a MySQL database to manage users and appointment requests.

## ✨ Features

- **User Login** — Provides a login interface for users.
- **Doctor Listings** — View available doctors through the application.
- **Appointment Booking** — Submit appointment requests by selecting a doctor, date, and time.
- **Appointment Tracking** — Store and track appointment statuses, including pending requests.
- **Database Management** — Use MySQL to persist application data.
- **Backend API** — Handle application requests using Node.js and Express.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Structure of web pages |
| CSS3 | Styling and layout |
| JavaScript | Client-side functionality |
| Node.js | Backend runtime |
| Express.js | Server and API development |
| MySQL | Relational database |
| Git and GitHub | Version control and source code hosting |

## 📂 Project Structure

```text
CareSync/
├── server.js          # Express backend server
├── login.html         # User login interface
├── doctors.html       # Doctor listings and booking interface
├── booking.html       # Appointment booking page
├── style.css          # Application styles
├── package.json       # Project metadata and dependencies
└── README.md          # Project documentation
```

*Update this structure if your actual project contains additional files or folders.*

## ⚙️ Getting Started

### Prerequisites

Install the following before running the application:

- [Node.js](https://nodejs.org/)
- [MySQL](https://www.mysql.com/)
- [Git](https://git-scm.com/)

A code editor such as [Visual Studio Code](https://code.visualstudio.com/) is recommended.

### 1. Clone the repository

```bash
git clone https://github.com/devanjanasputhalath/CareSync.git
```

### 2. Navigate to the project directory

```bash
cd CareSync
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure the MySQL database

- Start your MySQL server.
- Create the required database and tables.
- Configure the database connection in `server.js` using your local MySQL credentials.
- Ensure that the database and table names match those used by the application.

**Security note:** Never commit database passwords, API keys, or other sensitive credentials to GitHub. Use environment variables for secrets.

### 5. Start the application

Run the backend server:

```bash
node server.js
```

The server is configured to use port **3001**.

### 6. Open the application

When the server is running locally, open:

**http://localhost:3001**

The available pages and navigation depend on how the routes are configured in `server.js`.

## 🔄 How It Works

1. The user accesses the application and logs in.
2. The user views the available doctors.
3. The user selects a doctor and enters the appointment details.
4. The frontend sends the booking request to the backend.
5. The Express server processes the request and interacts with MySQL.
6. The appointment details and status are stored in the database.
7. The appointment status can be checked through the application's available functionality or the database.

## 🗄️ Database

CareSync uses MySQL to persist application data, including user and appointment records.

The appointment data includes fields such as:

- Appointment ID
- User ID
- Doctor ID
- Appointment date
- Appointment time
- Reason for appointment
- Appointment status
- Creation timestamp

The exact schema depends on the tables configured in your MySQL database.

## 🎯 Project Objective

The objective of CareSync is to simplify the doctor appointment booking process through a convenient web interface and a structured backend.

This project provides practical experience in frontend development, backend API implementation, relational database integration, and version control using Git and GitHub.

## 🚀 Future Enhancements

- User registration and secure authentication
- Doctor availability and time-slot management
- Appointment cancellation and rescheduling
- Separate patient and doctor dashboards
- Appointment history and notifications
- Improved form validation and error handling
- Responsive design for mobile devices
- Stronger access control and security measures

## 👩‍💻 Author

**Devanjana S Puthalath**

GitHub: [@devanjanasputhalath](https://github.com/devanjanasputhalath)

## 📄 License

This project is currently available for learning and development purposes. A formal license can be added if the project is distributed publicly.

---

*CareSync — Making healthcare appointments simpler.*
