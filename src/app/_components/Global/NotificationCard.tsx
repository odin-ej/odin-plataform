
import { cn } from "@/lib/utils"; // Se você usa tailwind-merge ou clsx
import { NotificationType } from "./Header";
import { Notification } from "@prisma/client";
import Link from "next/link";

const getNotificationStyles = (
  type?: Notification["type"],
  notificationUser?: boolean
) => {
  if (notificationUser)
    return "bg-gray-600/10 border-gray-600/10 text-gray-600/60 hover:bg-gray-600/20";
  switch (type) {
    case "POINTS_AWARDED":
      return "bg-[#f5b719]/20 hover:bg-[#f5b719]/30 transition-colors border-[#f5b719]/50 text-[#f5b719]";
    case "REQUEST_APPROVED":
      return "bg-green-400-20 hover:bg-green-400/30 transition-colors border-green-400 text-green-400";
    case "REQUEST_REJECTED":
      return "bg-red-400/20 hover:bg-red-400/30 transition-colors border-red-400 text-red-400";
    case "NEW_MENTION":
      return "bg-[#0126fb]/20 hover:bg-[#0126fb]/30 transition-colors border-[#0126fb]/50 text-white";
    case "GENERAL_ALERT":
      return "bg-[#010d26]/30 hover:bg-[#010d26]/50 transition-colors border-[#010d26]/50 text-white";
    default:
      return "bg-gray-100 border-gray-300 text-gray-800";
  }
};

interface Props {
  notificationUser: NotificationType;
}

const NotificationCard = ({ notificationUser }: Props) => {
  return (
    <div
      className={cn(
        "p-3 mb-2 rounded-lg border shadow-sm text-sm font-medium",
        getNotificationStyles(notificationUser.notification.type)
      )}
    >
      <p>{notificationUser.notification.notification}</p>
      <div className="flex gap-2">
        {notificationUser.notification.link && (
          <Link
            href={notificationUser.notification.link}
            className="block mt-1 text-xs transition-colors underline hover:text-blue-600"
          >
            Saiba mais
          </Link>
        )}
        {notificationUser.isRead && (
          <p className="text-xs text-gray-500 mt-1">Visto</p>
        )}
      </div>
    </div>
  );
};

export default NotificationCard;
