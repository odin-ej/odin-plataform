import { NextResponse } from "next/server";
import { sendScheduledNotifications } from "@/lib/actions/notifications";

// Vercel Cron calls this every 5 minutes
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendScheduledNotifications();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cron send-scheduled error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
