"use client";

import React, { Fragment, useRef, ElementRef } from "react";
import { Loader2, ServerCrash } from "lucide-react";
import { format } from "date-fns";

import { ChatWelcome } from "@/components/chat/chat-welcome";
import { ChatItem } from "@/components/chat/chat-item";
import { useRoomMessages } from "@/hooks/use-room-messages";
import { useChatScroll } from "@/hooks/use-chat-scroll";

interface ChatMessagesProps {
  name: string;
  member: any; // Current user member info
  chatId: string;
  apiUrl: string;
  socketUrl: string;
  socketQuery: Record<string, string>;
  paramKey: "channelId" | "conversationId";
  paramValue: string;
  type: "channel" | "conversation";
}

type MessagesWithMemberWithProfile = any & {
  member: any & {
    profile: any;
  };
};

const DATE_FORMAT = "d MMM yyyy, HH:mm";

export function ChatMessages({
  name,
  member,
  chatId,
  apiUrl,
  socketUrl,
  socketQuery,
  paramKey,
  paramValue,
  type
}: ChatMessagesProps) {
  const queryKey = `chat:${chatId}`;
  const addKey = `chat:${chatId}:messages`;
  const updateKey = `chat:${chatId}:messages:update`;

  const chatRef = useRef<ElementRef<"div">>(null);
  const bottomRef = useRef<ElementRef<"div">>(null);

  // Use Matrix hooks instead of Discord hooks
  const { 
    messages, 
    isLoading, 
    hasMore, 
    loadMore, 
    error, 
    isLoadingMore 
  } = useRoomMessages(chatId);

  // Convert Matrix messages to Discord-compatible format
  const data = {
    pages: (messages && messages.length > 0) ? [{
      items: messages.map((event: any) => ({
        id: event.getId?.() || 'unknown',
        content: event.getContent?.()?.body || '',
        fileUrl: event.getContent?.()?.url || null,
        deleted: event.isRedacted?.() || false,
        createdAt: new Date(event.getTs?.() || Date.now()),
        updatedAt: new Date(event.getTs?.() || Date.now()),
        member: {
          userId: event.getSender?.() || '',
          profile: {
            name: event.getSender?.() || 'Unknown User',
            imageUrl: null,
          },
        },
      }))
    }] : []
  };

  const hasNextPage = hasMore;
  const isFetchingNextPage = isLoadingMore;
  const fetchNextPage = loadMore;
  const status = isLoading ? "loading" : error ? "error" : "success";

  useChatScroll({
    chatRef,
    bottomRef,
    loadMore: fetchNextPage,
    shouldLoadMore: !isFetchingNextPage && !!hasNextPage,
    count: data?.pages?.[0]?.items?.length ?? 0
  });

  if (status === "loading")
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <Loader2 className="h-7 w-7 text-zinc-500 animate-spin my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Loading messages...
        </p>
      </div>
    );

  if (status === "error")
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <ServerCrash className="h-7 w-7 text-zinc-500 my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Something went wrong!
        </p>
      </div>
    );

  return (
    <div
      className="flex-1 flex flex-col py-4 overflow-y-auto"
      ref={chatRef}
    >
      {!hasNextPage && <div className="flex-1" />}
      {!hasNextPage && <ChatWelcome name={name} type={type} />}
      {hasNextPage && (
        <div className="flex justify-center">
          {isFetchingNextPage ? (
            <Loader2 className="h-6 w-6 text-zinc-500 animate-spin my-4" />
          ) : (
            <button
              onClick={() => fetchNextPage()}
              className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 text-xs my-4 dark:hover:text-zinc-300 transition"
            >
              Load previous messages
            </button>
          )}
        </div>
      )}
      <div className="flex flex-col-reverse mt-auto">
        {data?.pages.map((group, index) => (
          <Fragment key={index}>
            {group?.items.map((message: MessagesWithMemberWithProfile) => (
              <ChatItem
                key={message.id}
                currentMember={member}
                member={message.member}
                id={message.id}
                content={message.content}
                fileUrl={message.fileUrl}
                deleted={message.deleted}
                timestamp={format(
                  new Date(message.createdAt),
                  DATE_FORMAT
                )}
                isUpdated={message.updatedAt !== message.createdAt}
                socketQuery={socketQuery}
                socketUrl={socketUrl}
              />
            ))}
          </Fragment>
        ))}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}