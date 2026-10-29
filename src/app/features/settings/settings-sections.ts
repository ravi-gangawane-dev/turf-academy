export const SETTINGS_SECTIONS = [
  {
    "label": "Profile",
    "icon": "pi-building",
    "description": "Academy name, contact details, and branding.",
    "path": "/settings/profile"
  },
  {
    "label": "Operations",
    "icon": "pi-globe",
    "description": "Timezone, currency, attendance grace period, and fee due dates.",
    "path": "/settings/operations"
  },
  {
    "label": "Attendance",
    "icon": "pi-calendar",
    "description": "Check-in rules and grace period.",
    "path": "/settings/attendance"
  },
  {
    "label": "Notifications",
    "icon": "pi-bell",
    "description": "Notification channels and messaging preferences.",
    "path": "/settings/notifications"
  },
  {
    "label": "Users & Roles",
    "icon": "pi-users",
    "description": "Invite users, manage account access, and review role permissions.",
    "path": "/settings/users"
  },
  {
    "label": "Audit log",
    "icon": "pi-history",
    "description": "Review recorded activity and changes.",
    "path": "/settings/audit-logs"
  },
  {
    "label": "Tools & Data",
    "icon": "pi-download",
    "description": "Customize appearance and export academy records.",
    "path": "/settings/tools"
  },
  {
    "label": "Dialog Playground",
    "icon": "pi-comment",
    "description": "Preview and explore application dialogs.",
    "path": "/settings/dialog-playground"
  },
  {
    "label": "Design System",
    "icon": "pi-objects-column",
    "description": "Explore shared components and visual styles.",
    "path": "/design/Foundations/overview"
  },
  {
    "label": "Developer Handoff",
    "icon": "pi-code",
    "description": "Browse implementation guidance and resources.",
    "path": "/handoff/overview"
  }
] as const;
