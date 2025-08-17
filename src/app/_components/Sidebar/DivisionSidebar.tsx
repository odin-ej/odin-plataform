import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import React from "react";

interface DivisionSidebarProps {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  array: any[];
  setActiveLink: (href: string) => void;
  activeLink: string;
}

const DivisionSidebar = ({
  label,
  activeLink,
  array,
  setActiveLink,
}: DivisionSidebarProps) => {
  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarGroup className="px-0">
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="w-full cursor-pointer hover:bg-white/10 rounded-none text-white">
            {label}
            <ChevronDown
              color="white"
              className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180"
            />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {array.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      setActiveLink(item.href);
                    }}
                  >
                    <SidebarMenuButton
                      className={cn(
                        "transition-all duration-300 cursor-pointer rounded-none hover:text-[#f5b719] text-white",
                        activeLink === item.href
                          ? "bg-[#0126fb] font-bold hover:bg-[#0126fb]/80 shadow-[4px_0_18px_-3px_rgba(1,38,251,1)]"
                          : "hover:bg-white/10 "
                      )}
                    >
                      <item.icon className="ml-2 mr-3 h-4 w-4" />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
};

export default DivisionSidebar;
