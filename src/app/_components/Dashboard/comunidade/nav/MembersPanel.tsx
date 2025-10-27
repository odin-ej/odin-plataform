import { X } from "lucide-react";
import { useState } from "react";
import { FullUser } from "@/lib/server-utils";
import ContentSidebarRight from "./ContentSidebarRight";
import MemberViewModal from "../../cultural/MemberViewModal";
import { cn } from "@/lib/utils";

const MembersPanel = ({
  isOpen,
  onClose,
  allUsers,
  exMembers,
}: {
  isOpen: boolean;
  onClose: () => void;
  allUsers: FullUser[];
  exMembers: FullUser[];
}) => {
  const [selectedUser, setSelectedUser] = useState<FullUser | undefined>();
  const [memberViewOpen, setMemberViewOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-[#010d26] p-4 flex flex-col transition-transform duration-300 ease-in-out lg:hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <button
          onClick={onClose}
          className="p-1 rounded-full absolute top-4 right-4 hover:bg-white/10"
        >
          <X size={20} />
        </button>
        <ContentSidebarRight allUsers={allUsers} exMembers={exMembers} setMemberViewOpen={setMemberViewOpen} setSelectedUser={setSelectedUser} />
      </div>
      {selectedUser && (
        <MemberViewModal
          user={selectedUser}
          open={memberViewOpen}
          onOpenChange={setMemberViewOpen}
        />
      )}
    </>
  );
};

export default MembersPanel;
