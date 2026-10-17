import React from "react";

export type IconName = 
  | "new-chat"
  | "search"
  | "attach"
  | "voice"
  | "send"
  | "stop"
  | "copy"
  | "check"
  | "regenerate"
  | "sidebar"
  | "settings"
  | "trash"
  | "edit"
  | "sparkles"
  | "agent"
  | "skills"
  | "research"
  | "apps"
  | "share"
  | "close"
  | "chevron-down"
  | "user"
  | "error"
  | "crown"
  | "shield"
  | "link"
  | "unlink"
  | "upload"
  | "download"
  | "mail"
  | "folder"
  | "file"
  | "calendar"
  | "table"
  | "youtube"
  | "message"
  | "mic"
  | "mic-off"
  | "volume"
  | "lock"
  | "globe"
  | "brain"
  | "plus"
  | "arrow-left"
  | "refresh"
  | "alert";

interface AppIconProps {
  name: IconName;
  size?: number | string;
  className?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 18,
  className = "",
}) => {
  const strokeWidth = 1.6;

  const renderPath = () => {
    switch (name) {
      case "new-chat":
        return (
          <>
            <path d="M12 20h9" strokeLinecap="round" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" strokeLinecap="round" />
          </>
        );
      case "search":
        return (
          <>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </>
        );
      case "attach":
        return (
          <path
            d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case "voice":
      case "mic":
        return (
          <>
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" />
            <line x1="12" y1="19" x2="12" y2="22" strokeLinecap="round" />
          </>
        );
      case "mic-off":
        return (
          <>
            <line x1="2" y1="2" x2="22" y2="22" strokeLinecap="round" />
            <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" strokeLinecap="round" />
            <path d="M5 10v2a7 7 0 0 0 12 5" strokeLinecap="round" />
            <line x1="12" y1="19" x2="12" y2="22" strokeLinecap="round" />
            <path d="M9.64 4.05A3 3 0 0 1 15 6v3" strokeLinecap="round" />
          </>
        );
      case "volume":
        return (
          <>
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" strokeLinejoin="round" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" strokeLinecap="round" />
          </>
        );
      case "send":
        return (
          <>
            <path d="M12 19V5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m5 12 7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case "stop":
        return <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />;
      case "copy":
        return (
          <>
            <rect x="9" y="9" width="12" height="12" rx="2" strokeLinejoin="round" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" />
          </>
        );
      case "check":
        return <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />;
      case "regenerate":
      case "refresh":
        return (
          <>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" strokeLinecap="round" />
            <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" strokeLinecap="round" />
            <path d="M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case "sidebar":
        return (
          <>
            <rect x="3" y="3" width="18" height="18" rx="2" strokeLinejoin="round" />
            <path d="M9 3v18" strokeLinecap="round" />
          </>
        );
      case "settings":
        return (
          <>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case "trash":
        return (
          <>
            <path d="M3 6h18" strokeLinecap="round" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case "edit":
        return (
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round" />
        );
      case "sparkles":
        return (
          <path d="m12 3 2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5L12 3z" strokeLinejoin="round" />
        );
      case "agent":
        return (
          <>
            <rect x="4" y="8" width="16" height="12" rx="3" strokeLinejoin="round" />
            <path d="M12 2v6" strokeLinecap="round" />
            <circle cx="9" cy="13" r="1" fill="currentColor" />
            <circle cx="15" cy="13" r="1" fill="currentColor" />
            <path d="M9 17h6" strokeLinecap="round" />
          </>
        );
      case "skills":
        return (
          <>
            <rect x="4" y="4" width="16" height="16" rx="2" strokeLinejoin="round" />
            <rect x="9" y="9" width="6" height="6" strokeLinejoin="round" />
            <path d="M9 2v2M15 2v2M9 20v2M15 20v2M20 9h2M20 15h2M2 9h2M2 15h2" strokeLinecap="round" />
          </>
        );
      case "research":
        return (
          <>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinejoin="round" />
          </>
        );
      case "apps":
        return (
          <>
            <rect x="3" y="3" width="7" height="7" rx="1.5" strokeLinejoin="round" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" strokeLinejoin="round" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" strokeLinejoin="round" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" strokeLinejoin="round" />
          </>
        );
      case "share":
        return (
          <>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" strokeLinecap="round" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" strokeLinecap="round" />
          </>
        );
      case "close":
        return (
          <>
            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
          </>
        );
      case "chevron-down":
        return <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />;
      case "user":
        return (
          <>
            <circle cx="12" cy="8" r="4" />
            <path d="M6 20v-1a6 6 0 0 1 12 0v1" strokeLinecap="round" />
          </>
        );
      case "error":
      case "alert":
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
          </>
        );
      case "crown":
        return (
          <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z" strokeLinejoin="round" />
        );
      case "shield":
        return (
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
        );
      case "link":
        return (
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
        );
      case "unlink":
        return (
          <>
            <path d="m18.84 12.25 1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m5.16 11.75-1.72 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="2" y1="2" x2="22" y2="22" strokeLinecap="round" />
          </>
        );
      case "upload":
        return (
          <>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
          </>
        );
      case "download":
        return (
          <>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" />
          </>
        );
      case "mail":
        return (
          <>
            <rect x="2" y="4" width="20" height="16" rx="2" strokeLinejoin="round" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case "folder":
        return (
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" strokeLinejoin="round" />
        );
      case "file":
        return (
          <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
            <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case "calendar":
        return (
          <>
            <rect x="3" y="4" width="18" height="18" rx="2" strokeLinejoin="round" />
            <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
            <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
            <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" />
          </>
        );
      case "table":
        return (
          <>
            <rect x="3" y="3" width="18" height="18" rx="2" strokeLinejoin="round" />
            <line x1="3" y1="9" x2="21" y2="9" strokeLinecap="round" />
            <line x1="3" y1="15" x2="21" y2="15" strokeLinecap="round" />
            <line x1="9" y1="3" x2="9" y2="21" strokeLinecap="round" />
            <line x1="15" y1="3" x2="15" y2="21" strokeLinecap="round" />
          </>
        );
      case "youtube":
        return (
          <>
            <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" strokeLinejoin="round" />
            <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" />
          </>
        );
      case "message":
        return (
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinejoin="round" />
        );
      case "lock":
        return (
          <>
            <rect x="3" y="11" width="18" height="11" rx="2" strokeLinejoin="round" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case "globe":
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" strokeLinecap="round" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case "brain":
        return (
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-5.04zm5 0A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-5.04z" strokeLinejoin="round" />
        );
      case "plus":
        return (
          <>
            <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
            <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
          </>
        );
      case "arrow-left":
        return (
          <>
            <line x1="19" y1="12" x2="5" y2="12" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="12 19 5 12 12 5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={`inline-block shrink-0 align-middle ${className}`}
      aria-hidden="true"
    >
      {renderPath()}
    </svg>
  );
};
