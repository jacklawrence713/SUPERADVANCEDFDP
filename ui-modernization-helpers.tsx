// ═══════════════════════════════════════════════════════════════════════════
// FANTASY DRAFT PROS — UI MODERNIZATION HELPERS
// Reusable components & helper functions for modern design system
// ═══════════════════════════════════════════════════════════════════════════

import React from "react";

// ───────────────────────────────────────────────────────────────────────────
// THEME HELPER - Maps inline styles to CSS variables
// ───────────────────────────────────────────────────────────────────────────

export function createThemeVars(isDarkMode: boolean) {
  if (isDarkMode) {
    return {
      bg: "var(--bg)",
      bgCard: "var(--surface)",
      bgCardElevated: "var(--surface-elevated)",
      bgInput: "var(--surface-elevated)",
      border: "var(--border)",
      borderPurple: "var(--border-accent)",
      purple: "var(--accent-primary)",
      purpleLight: "var(--accent-primary-light)",
      purpleDim: "var(--accent-primary-dim)",
      text: "var(--text-primary)",
      textSub: "var(--text-secondary)",
      textDim: "var(--text-muted)",
      green: "var(--status-success)",
      red: "var(--status-danger)",
      gold: "var(--status-warning)",
      cyan: "var(--status-info)",
    };
  } else {
    return {
      bg: "var(--bg)",
      bgCard: "var(--surface)",
      bgCardElevated: "var(--surface-elevated)",
      bgInput: "var(--surface-elevated)",
      border: "var(--border)",
      borderPurple: "var(--border-accent)",
      purple: "var(--accent-primary)",
      purpleLight: "var(--accent-primary-light)",
      purpleDim: "var(--accent-primary-dim)",
      text: "var(--text-primary)",
      textSub: "var(--text-secondary)",
      textDim: "var(--text-muted)",
      green: "var(--status-success)",
      red: "var(--status-danger)",
      gold: "var(--status-warning)",
      cyan: "var(--status-info)",
    };
  }
}

// ───────────────────────────────────────────────────────────────────────────
// CARD COMPONENT
// ───────────────────────────────────────────────────────────────────────────

export function Card({
  children,
  className = "",
  style = {},
  hoverable = true
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hoverable?: boolean;
}) {
  return React.createElement("div", {
    className: `card ${hoverable ? "" : ""} ${className}`.trim(),
    style,
  }, children);
}

// ───────────────────────────────────────────────────────────────────────────
// BUTTON COMPONENTS
// ───────────────────────────────────────────────────────────────────────────

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  style = {},
  type = "button",
  title = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  type?: "button" | "submit" | "reset";
  title?: string;
}) {
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const classes = `btn ${variantClass} ${sizeClass} ${className}`.trim();

  return React.createElement("button", {
    type,
    className: classes,
    onClick,
    disabled,
    title,
    style,
  }, children);
}

// ───────────────────────────────────────────────────────────────────────────
// TAB SYSTEM
// ───────────────────────────────────────────────────────────────────────────

export function TabNav({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { id: string; label: string; icon?: string }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}) {
  return React.createElement(
    "div",
    { className: "tab-nav" },
    tabs.map((tab) =>
      React.createElement(
        "button",
        {
          key: tab.id,
          className: `tab-item ${activeTab === tab.id ? "active" : ""}`,
          onClick: () => onTabChange(tab.id),
        },
        tab.icon && React.createElement("span", null, tab.icon),
        tab.label
      )
    )
  );
}

// ───────────────────────────────────────────────────────────────────────────
// BADGE / CHIP COMPONENTS
// ───────────────────────────────────────────────────────────────────────────

export function Badge({
  children,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "success" | "danger" | "warning" | "info";
  className?: string;
}) {
  return React.createElement(
    "span",
    { className: `badge badge-${variant} ${className}`.trim() },
    children
  );
}

// ───────────────────────────────────────────────────────────────────────────
// EMPTY STATE COMPONENT
// ───────────────────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return React.createElement("div", { className: "empty-state" },
    icon && React.createElement("div", { className: "empty-state-icon" }, icon),
    React.createElement("div", { className: "empty-state-title" }, title),
    description && React.createElement("div", { className: "empty-state-description" }, description),
    action && React.createElement("div", null, action)
  );
}

// ───────────────────────────────────────────────────────────────────────────
// ALERT COMPONENT
// ───────────────────────────────────────────────────────────────────────────

export function Alert({
  children,
  variant = "error",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "error" | "warning" | "success" | "info";
  className?: string;
}) {
  return React.createElement(
    "div",
    { className: `alert alert-${variant} ${className}`.trim() },
    children
  );
}

// ───────────────────────────────────────────────────────────────────────────
// LOADING SPINNER
// ───────────────────────────────────────────────────────────────────────────

export function Spinner() {
  return React.createElement("div", { className: "spinner" });
}

// ───────────────────────────────────────────────────────────────────────────
// SKELETON LOADER
// ───────────────────────────────────────────────────────────────────────────

export function Skeleton({ width = "100%", height = "20px" }: { width?: string; height?: string }) {
  return React.createElement("div", {
    className: "skeleton",
    style: { width, height, display: "block" },
  });
}

// ───────────────────────────────────────────────────────────────────────────
// DESKTOP LAYOUT WRAPPER
// ───────────────────────────────────────────────────────────────────────────

export function DesktopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return React.createElement("div", { className: "app-layout" },
    children
  );
}

// ───────────────────────────────────────────────────────────────────────────
// SIDEBAR HELPER
// ───────────────────────────────────────────────────────────────────────────

export function Sidebar({
  items,
  activeItem,
  onItemClick,
}: {
  items: { id: string; icon: string; label: string }[];
  activeItem: string;
  onItemClick: (id: string) => void;
}) {
  return React.createElement("nav", { className: "sidebar" },
    React.createElement("div", { className: "sidebar-nav" },
      items.map((item) =>
        React.createElement("button", {
          key: item.id,
          className: `sidebar-nav-item ${activeItem === item.id ? "active" : ""}`,
          onClick: () => onItemClick(item.id),
          title: item.label,
        },
          React.createElement("span", null, item.icon)
        )
      )
    )
  );
}

// ───────────────────────────────────────────────────────────────────────────
// HEADER HELPER
// ───────────────────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  actions,
  className = "",
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return React.createElement("div", { className: `header ${className}`.trim() },
    React.createElement("div", { className: "header-content" },
      React.createElement("div", null,
        React.createElement("h1", { className: "header-title" }, title),
        description && React.createElement("p", { className: "text-secondary" }, description)
      )
    ),
    actions && React.createElement("div", { className: "header-actions" }, actions)
  );
}

// ───────────────────────────────────────────────────────────────────────────
// GRID LAYOUT HELPER
// ───────────────────────────────────────────────────────────────────────────

export function GridLayout({
  children,
  columns = "auto-fit",
  gap = "16px",
  minWidth = "300px",
  className = "",
}: {
  children: React.ReactNode;
  columns?: string;
  gap?: string;
  minWidth?: string;
  className?: string;
}) {
  const gridTemplate = columns === "auto-fit"
    ? `repeat(auto-fit, minmax(${minWidth}, 1fr))`
    : columns;

  return React.createElement("div", {
    className: `grid ${className}`.trim(),
    style: {
      display: "grid",
      gridTemplateColumns: gridTemplate,
      gap,
    },
  }, children);
}

// ───────────────────────────────────────────────────────────────────────────
// FLEX LAYOUT HELPER
// ───────────────────────────────────────────────────────────────────────────

export function FlexLayout({
  children,
  direction = "row",
  gap = "16px",
  align = "center",
  justify = "flex-start",
  className = "",
}: {
  children: React.ReactNode;
  direction?: "row" | "column";
  gap?: string;
  align?: string;
  justify?: string;
  className?: string;
}) {
  return React.createElement("div", {
    className: `flex ${className}`.trim(),
    style: {
      display: "flex",
      flexDirection: direction,
      gap,
      alignItems: align,
      justifyContent: justify,
    },
  }, children);
}
