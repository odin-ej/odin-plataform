"use client";

import React, { useState, useEffect } from "react";
import CalendarView, { CustomCalendarProps } from "./CalendarView";
import CalendarSkeleton from "./CalendarSkeleton";

const CustomCalendarOAuth = ({
  className,
  clientId,
  calendarId,
}: CustomCalendarProps) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  if (!scriptLoaded) {
    return <div className="hidden min-[375px]:flex min-h-[400px]  min-[375px]:items-center  min-[375px]:justify-center">
      <CalendarSkeleton />
    </div>;
  }

  return (
    <div className="hidden min-[375px]:block min-h-[400px]">
      <CalendarView
        className={className}
        clientId={clientId}
        calendarId={calendarId}
      />
    </div>
  );
};
export default CustomCalendarOAuth;
