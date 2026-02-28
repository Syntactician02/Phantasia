export interface Task {
  title: string;
  assigned_to: string;
  last_updated_days_ago: number;
  status: "Done" | "In Progress" | "Blocked" | "Not Started";
}

export interface ProjectData {
  project_name: string;
  release_date: string;
  initial_features: string[];
  current_features: string[];
  tasks: Task[];
  messages: string[];
}

export const sampleProject: ProjectData = {
  project_name: "Apollo Platform v2.0",
  release_date: "2025-02-15",
  initial_features: ["User Authentication", "Dashboard", "Payments Integration", "Notifications", "Settings Page"],
  current_features: ["User Authentication", "Dashboard", "Payments Integration", "Notifications", "Settings Page", "Dark Mode", "Analytics Module", "AI Recommendations", "Export to CSV", "Team Collaboration"],
  tasks: [
    { title: "Implement Payments API", assigned_to: "Dev A", last_updated_days_ago: 6, status: "Blocked" },
    { title: "Design new Dashboard UI", assigned_to: "Designer B", last_updated_days_ago: 8, status: "In Progress" },
    { title: "Write unit tests for Auth", assigned_to: "Dev C", last_updated_days_ago: 2, status: "In Progress" },
    { title: "Deploy to staging", assigned_to: "DevOps D", last_updated_days_ago: 5, status: "Not Started" },
    { title: "Analytics Module - Backend", assigned_to: "Dev A", last_updated_days_ago: 9, status: "Not Started" },
    { title: "User onboarding flow", assigned_to: "Dev B", last_updated_days_ago: 1, status: "Done" },
    { title: "Stripe webhook handling", assigned_to: "Dev C", last_updated_days_ago: 4, status: "Blocked" },
    { title: "AI Recommendations engine", assigned_to: "Dev D", last_updated_days_ago: 12, status: "Not Started" },
  ],
  messages: [
    "Waiting for design approval on the new dashboard screens",
    "Blocked by backend API — can't proceed until Stripe webhooks are done",
    "Can we also add an analytics dashboard? PM just requested it",
    "Payment flow is pending QA sign-off",
    "Need approval from legal before we can ship the AI features",
    "The CSV export was added last minute — should be quick but adds scope",
    "Team collaboration feature requested by enterprise client",
    "Still waiting on the API keys from the third-party service",
    "Dark mode design is blocked pending brand guidelines approval",
    "Release might slip if analytics backend isn't started this week",
  ],
};

export const scopeGrowthHistory = [
  { week: "W1", features: 5 },
  { week: "W2", features: 5 },
  { week: "W3", features: 6 },
  { week: "W4", features: 7 },
  { week: "W5", features: 8 },
  { week: "W6", features: 10 },
];