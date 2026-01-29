import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handlers to suppress browser extension errors
// These errors are typically caused by Chrome extensions and don't affect app functionality
if (typeof window !== "undefined") {
  // Suppress runtime.lastError from Chrome extensions
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || "";
    // Filter out common browser extension errors
    if (
      message.includes("runtime.lastError") ||
      message.includes("message channel closed") ||
      message.includes("asynchronous response")
    ) {
      return; // Suppress these errors
    }
    originalError.apply(console, args);
  };

  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const message = event.reason?.message || event.reason?.toString() || "";
    // Suppress browser extension related errors
    if (
      message.includes("runtime.lastError") ||
      message.includes("message channel closed") ||
      message.includes("asynchronous response")
    ) {
      event.preventDefault(); // Prevent error from appearing in console
      return;
    }
    // Log other unhandled rejections for debugging
    console.warn("Unhandled promise rejection:", event.reason);
  });

  // Handle general errors
  window.addEventListener("error", (event) => {
    const message = event.message || "";
    // Suppress browser extension related errors
    if (
      message.includes("runtime.lastError") ||
      message.includes("message channel closed") ||
      message.includes("asynchronous response")
    ) {
      event.preventDefault(); // Prevent error from appearing in console
      return;
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
