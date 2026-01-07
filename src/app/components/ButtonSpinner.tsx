"use client";

import React from "react";
import Spinner from "./Spinner";

export default function ButtonSpinner({
  loading,
  children,
  loadingText = "Loading…",
  className = "",
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading: boolean;
  loadingText?: string;
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-xs font-semibold shadow-sm",
        loading || disabled
          ? "cursor-not-allowed bg-slate-300 text-slate-600"
          : "bg-blue-600 text-white hover:bg-blue-700",
        className,
      ].join(" ")}
    >
      {loading ? (
        <>
          <Spinner size={16} className="text-slate-700" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
