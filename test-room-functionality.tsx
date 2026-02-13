/**
 * Test Component for Room Functionality
 * 
 * This component demonstrates and tests the new room management functionality.
 * Can be temporarily imported and used in a page to verify everything works.
 */

"use client";

import React, { useState } from 'react';
import { useSpaces } from '@/hooks/use-spaces';
import { useSpaceChannels } from '@/hooks/use-space-channels';
import { useRoomActions } from '@/hooks/use-room-actions';

interface RoomFunctionalityTestProps {
  /** Optional space ID to test channel functionality */
  spaceId?: string;
}

export function RoomFunctionalityTest({ spaceId }: RoomFunctionalityTestProps) {
  const { spaces, isLoading: spacesLoading, error: spacesError } = useSpaces();
  const { categories, channels, isLoading: channelsLoading, error: channelsError } = useSpaceChannels(spaceId || null);
  const { 
    createRoom, 
    createSpace, 
    joinRoomByIdOrAlias, 
    leaveRoom,
    searchPublicRooms,
    isLoading: actionsLoading,
    error: actionsError,
    clearError
  } = useRoomActions();
  
  const [roomInput, setRoomInput] = useState('');
  const [spaceInput, setSpaceInput] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Test creating a space
  const handleCreateSpace = async () => {
    if (!spaceInput.trim()) return;
    try {
      const spaceId = await createSpace(spaceInput.trim());
      console.log('✅ Created space:', spaceId);
      setSpaceInput('');
    } catch (error) {
      console.error('❌ Failed to create space:', error);
    }
  };

  // Test creating a room
  const handleCreateRoom = async () => {
    if (!roomInput.trim()) return;
    try {
      const roomId = await createRoom(roomInput.trim(), 'text', spaceId);
      console.log('✅ Created room:', roomId);
      setRoomInput('');
    } catch (error) {
      console.error('❌ Failed to create room:', error);
    }
  };

  // Test joining a room
  const handleJoinRoom = async () => {
    if (!joinInput.trim()) return;
    try {
      const roomId = await joinRoomByIdOrAlias(joinInput.trim());
      console.log('✅ Joined room:', roomId);
      setJoinInput('');
    } catch (error) {
      console.error('❌ Failed to join room:', error);
    }
  };

  // Test leaving a room
  const handleLeaveRoom = async (roomId: string) => {
    try {
      await leaveRoom(roomId);
      console.log('✅ Left room:', roomId);
    } catch (error) {
      console.error('❌ Failed to leave room:', error);
    }
  };

  // Test searching public rooms
  const handleSearchRooms = async () => {
    if (!searchInput.trim()) return;
    try {
      const results = await searchPublicRooms(searchInput.trim(), 10);
      setSearchResults(results);
      console.log('✅ Found rooms:', results);
    } catch (error) {
      console.error('❌ Failed to search rooms:', error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Room Functionality Test</h1>
      
      {/* Error Display */}
      {(spacesError || channelsError || actionsError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {spacesError || channelsError || actionsError}
          <button onClick={clearError} className="ml-2 underline">Clear</button>
        </div>
      )}

      {/* Spaces List */}
      <section>
        <h2 className="text-xl font-semibold mb-4">📚 Joined Spaces (Discord Servers)</h2>
        {spacesLoading ? (
          <p>Loading spaces...</p>
        ) : (
          <div className="space-y-2">
            {spaces.length === 0 ? (
              <p className="text-gray-500">No spaces joined yet</p>
            ) : (
              spaces.map(space => (
                <div key={space.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {space.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{space.name}</p>
                    <p className="text-sm text-gray-500">ID: {space.id}</p>
                    {space.hasUnread && <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">Unread</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Channels List (if space selected) */}
      {spaceId && (
        <section>
          <h2 className="text-xl font-semibold mb-4">💬 Space Channels</h2>
          {channelsLoading ? (
            <p>Loading channels...</p>
          ) : (
            <div className="space-y-4">
              {categories.length === 0 ? (
                <p className="text-gray-500">No channels in this space</p>
              ) : (
                categories.map(category => (
                  <div key={category.id}>
                    <h3 className="font-semibold text-gray-700 mb-2">{category.name}</h3>
                    <div className="ml-4 space-y-1">
                      {category.channels.map(channel => (
                        <div key={channel.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">#{channel.name}</span>
                            <span className="ml-2 text-sm text-gray-500">({channel.type})</span>
                            {channel.hasUnread && <span className="ml-2 text-xs bg-red-500 text-white px-1 rounded">!</span>}
                          </div>
                          <button 
                            onClick={() => handleLeaveRoom(channel.id)}
                            className="text-red-600 text-sm hover:underline"
                          >
                            Leave
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      )}

      {/* Create Space */}
      <section>
        <h2 className="text-xl font-semibold mb-4">🏢 Create Space (Server)</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            value={spaceInput}
            onChange={(e) => setSpaceInput(e.target.value)}
            placeholder="Space name"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={handleCreateSpace}
            disabled={actionsLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </section>

      {/* Create Room */}
      {spaceId && (
        <section>
          <h2 className="text-xl font-semibold mb-4">➕ Create Channel</h2>
          <div className="flex space-x-2">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Channel name"
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={handleCreateRoom}
              disabled={actionsLoading}
              className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </section>
      )}

      {/* Join Room */}
      <section>
        <h2 className="text-xl font-semibold mb-4">🔗 Join Room/Space by ID/Alias</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
            placeholder="!roomId:server.com or #alias:server.com"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={handleJoinRoom}
            disabled={actionsLoading}
            className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
          >
            Join
          </button>
        </div>
      </section>

      {/* Search Public Rooms */}
      <section>
        <h2 className="text-xl font-semibold mb-4">🔍 Search Public Rooms</h2>
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search term"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={handleSearchRooms}
            disabled={actionsLoading}
            className="px-4 py-2 bg-orange-500 text-white rounded disabled:opacity-50"
          >
            Search
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map(room => (
              <div key={room.roomId} className="p-3 bg-gray-50 rounded">
                <p className="font-medium">{room.name || room.alias || room.roomId}</p>
                <p className="text-sm text-gray-600">{room.topic}</p>
                <p className="text-xs text-gray-500">{room.memberCount} members</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Loading State */}
      {actionsLoading && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow">
          Processing...
        </div>
      )}
    </div>
  );
}