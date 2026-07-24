# Workforce Execution Platform (MVP)

A System Design Case Study for digitizing daily field operations, crew management, approval workflows, and reporting.

This project presents a scalable **Minimum Viable Product (MVP)** architecture designed to replace Excel-based planning and manual approval processes with a centralized web and mobile platform.

---

## Project Overview

The platform enables organizations to manage the complete daily workforce execution lifecycle:

- Create Daily Plans from monthly production plans
- Assign work to Head of Masters
- Create crews and assign workers
- Execute field operations
- Submit actual progress
- Multi-level approval workflow
- Automatic Daily Report generation
- Power BI integration for KPI reporting

---

## Business Workflow

```text
Technical Office
        │
        ▼
Create Daily Plan
        │
        ▼
Assign to Head of Master
        │
        ▼
Create Crew
Assign Workers
        │
        ▼
Execute Work
        │
        ▼
Submit Actual Quantity
        │
        ▼
Site Chief Approval
        │
        ▼
Project Manager Approval
        │
        ▼
Daily Report
        │
        ▼
Power BI Dashboard
```

---

# Features

### Functional Requirements

- Authentication & Authorization
- Project Management
- Region & Location Management
- Daily Planning
- Crew Management
- Worker Assignment
- Approval Workflow
- Push Notifications
- Daily Reporting
- Power BI Integration
- Audit History

---

### Non-Functional Requirements

- Scalability
- High Availability
- Performance
- Security
- Offline Mobile Support
- Caching
- Audit Logging
- Monitoring
- Maintainability
- Extensibility

---

# Architecture

The MVP follows a **Modular Monolith Architecture**.

Future migration to Microservices is supported without major architectural changes.

## High-Level Components

- Desktop Web Application
- Mobile Application
- REST API
- Authentication Layer
- RBAC Authorization
- Business Modules
- PostgreSQL
- Redis Cache
- Firebase Cloud Messaging
- Power BI

---

# Technology Stack

| Layer | Technology |
|---------|------------|
| Frontend | React + TypeScript |
| Mobile | React Native |
| Backend | NestJS |
| Database | PostgreSQL |
| Cache | Redis |
| Authentication | JWT |
| Notifications | Firebase Cloud Messaging (FCM) |
| Reporting | Power BI |
| Deployment | Docker |

---

# Core Modules

- Authentication
- User Management
- Role & Permission Management
- Project Management
- Daily Planning
- Crew Management
- Approval Workflow
- Reporting
- Notifications
- Audit History

---

# Authorization Model

The platform implements:

- Role-Based Access Control (RBAC)
- Scope-Based Authorization

Scopes include:

- Project
- Region
- Location

Permissions are dynamically assigned to Roles, allowing future business changes without modifying application logic.

---

# Approval Workflow

```text
Draft
    │
    ▼
Assigned
    │
    ▼
In Progress
    │
    ▼
Completed
    │
    ▼
Submitted
    │
    ▼
Approved by Site Chief
    │
    ▼
Approved by Project Manager
    │
    ▼
Reported
```

Rejected records return to the responsible user with comments for correction and resubmission.

---

# Offline Strategy

The mobile application supports offline execution.

When there is no internet connection:

- User actions are stored locally
- Operations receive an Idempotency Key
- Pending actions are synchronized automatically when connectivity is restored
- FIFO synchronization preserves execution order

---

# Security

- JWT Authentication
- Password Hashing
- HTTPS
- Role-Based Authorization
- Scope-Based Access Control
- Audit Logging
- Secure REST APIs

---

# Caching Strategy

Redis is used to cache:

- User permissions
- Role definitions
- Frequently accessed reference data

If Redis becomes unavailable, the application automatically falls back to PostgreSQL.

---

# Reporting

Approved Daily Plans are consolidated into Daily Reports.

Power BI connects using **read-only** access to visualize:

- Planned vs Actual Quantity
- Productivity
- Man-Day
- Overtime
- Operational KPIs

---

# Project Structure

```
workforce-execution-platform/
│
├── docs/
│   ├── Workforce_Execution_Platform_MVP.pdf
│   ├── Architecture.png
│   ├── ER_Diagram.png
│   ├── Workflow.png
│   ├── Scope_Diagram.png
│   └── Sequence_Diagram.png
│
├── diagrams/
│   ├── architecture.drawio
│   ├── er.dbml
│   ├── workflow.mmd
│   └── sequence.mmd
│
├── README.md
└── LICENSE
```

---

# Future Enhancements

The MVP architecture is intentionally simple while remaining extensible.

Potential future improvements include:

- Workflow Engine
- Queue & Worker Processing
- Event-Driven Architecture
- Microservices
- Kubernetes Deployment
- Distributed Tracing
- OpenTelemetry
- Elasticsearch
- Multi-Tenant Support
- Multi-Project Support

---

# Design Principles

- Clean Architecture
- Layered Architecture
- Separation of Concerns
- Modular Monolith
- SOLID Principles
- Configuration over Hardcoding
- Future Scalability

---

# Author

**Ali Almanea**

Senior Full Stack Engineer

- React
- React Native
- NestJS
- TypeScript
- PostgreSQL
- Redis
- System Design
- Cloud Architecture

---

> This repository contains the architectural design of an MVP solution prepared as a System Design Case Study. It focuses on software architecture, scalability, maintainability, and engineering best practices rather than production-ready implementation.
