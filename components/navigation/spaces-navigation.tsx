'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpaces } from '@/hooks/use-spaces';
import { ActionTooltip } from '@/components/action-tooltip';
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModeToggle } from "@/components/mode-toggle";
import { useModal } from "@/hooks/use-modal-store";

// Discord clone exact styling for NavigationItem
interface NavigationItemProps {
  id: string;
  imageUrl: string | null;
  name: string;
}

function NavigationItem({ id, imageUrl, name }: NavigationItemProps) {
  const params = { serverId: usePathname()?.match(/^\/servers\/([^\/]+)/)?.[1] };
  const router = useRouter();
  const decodedServerId = params?.serverId ? decodeURIComponent(params.serverId) : null;

  const onClick = () => {
    router.push(`/servers/${encodeURIComponent(id)}`);
  };

  // Generate initials for fallback
  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ActionTooltip side="right" align="center" label={name}>
      <button onClick={onClick} className="group relative flex items-center">
        <div
          className={cn(
            "absolute left-0 bg-primary rounded-full transition-all w-[4px]",
            decodedServerId !== id && "group-hover:h-[20px]",
            decodedServerId === id ? "h-[36px]" : "h-[8px]"
          )}
        />
        <div
          className={cn(
            "relative group flex mx-3 h-[48px] w-[48px] rounded-[24px] group-hover:rounded-[16px] transition-all overflow-hidden items-center justify-center",
            decodedServerId === id
              ? "bg-primary/10 text-primary rounded-[16px]"
              : "bg-background dark:bg-neutral-700"
          )}
        >
          {imageUrl ? (
            <Image fill src={imageUrl} alt={name} className="object-cover" />
          ) : (
            <span className="font-semibold text-sm">{initials}</span>
          )}
        </div>
      </button>
    </ActionTooltip>
  );
}

// Discord clone exact styling for NavigationAction (Add Server button)
function NavigationAction() {
  const { onOpen } = useModal();

  return (
    <div>
      <ActionTooltip side="right" align="center" label="Add a server">
        <button
          onClick={() => onOpen("createServer")}
          className="group flex items-center"
        >
          <div className="flex mx-3 h-[48px] w-[48px] rounded-[24px] group-hover:rounded-[16px] transition-all overflow-hidden items-center justify-center bg-background dark:bg-neutral-700 group-hover:bg-emerald-500">
            <Plus
              className="group-hover:text-white transition text-emerald-500"
              size={25}
            />
          </div>
        </button>
      </ActionTooltip>
    </div>
  );
}

export function SpacesNavigation() {
  const { spaces, isLoading, error } = useSpaces();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="space-y-4 flex flex-col h-full items-center text-primary w-full dark:bg-[#1e1f22] bg-[#e3e5e8] py-3" data-testid="spaces-loading">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 flex flex-col h-full items-center text-primary w-full dark:bg-[#1e1f22] bg-[#e3e5e8] py-3" data-testid="spaces-error">
        <div className="flex-1 flex flex-col items-center justify-center">
          <AlertCircle className="h-6 w-6 text-red-400 mb-2" />
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-zinc-500 hover:text-zinc-400"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 flex flex-col h-full items-center text-primary w-full dark:bg-[#1e1f22] bg-[#e3e5e8] py-3" data-testid="spaces-list">
      {/* Add Server Button - Discord puts this first */}
      <NavigationAction />
      
      {/* Separator - exact Discord style */}
      <Separator className="h-[2px] bg-zinc-300 dark:bg-zinc-700 rounded-md w-10 mx-auto" />
      
      {/* Server List */}
      <ScrollArea className="flex-1 w-full">
        {spaces.map((space) => (
          <div key={space.id} className="mb-4">
            <NavigationItem
              id={space.id}
              imageUrl={space.avatarUrl}
              name={space.name}
            />
          </div>
        ))}
        
        {/* Empty state */}
        {spaces.length === 0 && (
          <div className="px-2 py-4 text-center">
            <div className="text-zinc-500 text-xs">No servers yet</div>
          </div>
        )}
      </ScrollArea>
      
      {/* Bottom section - Mode Toggle */}
      <div className="pb-3 mt-auto flex items-center flex-col gap-y-4">
        <ModeToggle />
        {/* User button would go here - for Matrix we show profile differently */}
      </div>
    </div>
  );
}
