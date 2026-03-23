"use client";

import { FullUser } from "@/lib/server-utils";
import React, { useState } from "react";
import MemberViewModal from "../../cultural/MemberViewModal";
import ContentSidebarRight from "./ContentSidebarRight";

interface CommunitySidebarRightProps {
  allUsers: FullUser[];
  exMembers: FullUser[];
}

// --- COMPONENTE PRINCIPAL DA SIDEBAR ---
const CommunitySidebarRight = ({
  allUsers,
  exMembers,
}: CommunitySidebarRightProps) => {
  const [selectedUser, setSelectedUser] = useState<FullUser | undefined>();
  const [memberViewOpen, setMemberViewOpen] = useState(false);

  return (
    <>
      <aside className="w-72 bg-[#010d26] p-4 flex-col justify-between hidden lg:flex border-l-2 border-[#f5b719]">
        <ContentSidebarRight
          allUsers={allUsers}
          exMembers={exMembers}
          setSelectedUser={setSelectedUser}
          setMemberViewOpen={setMemberViewOpen}
        />
      </aside>

      {/* O MemberViewModal é renderizado aqui, controlado pelo estado 'viewingUser' */}
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

export default CommunitySidebarRight;
