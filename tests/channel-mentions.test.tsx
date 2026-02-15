import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { useMentions } from '@/hooks/use-mentions';
import { ChannelAutocomplete } from '@/components/chat/channel-autocomplete';
import { Room } from 'matrix-js-sdk';

// Mock Room creation function for testing
function createMockRoom(name: string, type: string = 'm.room.create'): Room {
  return {
    roomId: `!${name.toLowerCase().replace(/\s+/g, '-')}:example.com`,
    name,
    getStateEvents: (eventType: string) => {
      if (eventType === 'm.room.create') {
        return [{ getContent: () => ({ type }) }];
      }
      return [];
    },
    canonicalAlias: `#${name.toLowerCase().replace(/\s+/g, '-')}`,
    currentState: {
      getStateEvents: () => [{ getContent: () => ({ topic: `${name} topic` }) }],
    },
  } as Room;
}

describe('Channel Mentions', () => {
  const mockRooms: Room[] = [
    createMockRoom('General', 'm.room.create'),
    createMockRoom('Random', 'm.room.create'),
    createMockRoom('Voice Lounge', 'm.space.voice'),
    createMockRoom('Announcements', 'm.space.announcement'),
  ];

  const MockChannelAutocomplete = () => {
    const mentions = useMentions('test-room');
    
    return (
      <ChannelAutocomplete
        rooms={mockRooms}
        query={mentions.mentionQuery}
        position={{ top: 0, left: 0 }}
        visible={true}
        onSelect={(channel) => console.log(channel)}
        onClose={() => {}}
      />
    );
  };

  test('renders channel autocomplete', () => {
    render(<MockChannelAutocomplete />);
    
    // Check that all channels are rendered
    expect(screen.getByText('#General')).toBeInTheDocument();
    expect(screen.getByText('#Random')).toBeInTheDocument();
    expect(screen.getByText('#Voice Lounge')).toBeInTheDocument();
    expect(screen.getByText('#Announcements')).toBeInTheDocument();
  });

  test('filters channels by name', () => {
    // Initialize with query to filter channels
    const { rerender } = render(
      <ChannelAutocomplete
        rooms={mockRooms}
        query="gene"
        position={{ top: 0, left: 0 }}
        visible={true}
        onSelect={() => {}}
        onClose={() => {}}
      />
    );

    // Should only show channels matching query
    expect(screen.getByText('#General')).toBeInTheDocument();
    expect(screen.queryByText('#Random')).not.toBeInTheDocument();
    expect(screen.queryByText('#Voice Lounge')).not.toBeInTheDocument();
  });

  test('keyboard navigation works', () => {
    const handleSelect = jest.fn();

    render(
      <ChannelAutocomplete
        rooms={mockRooms}
        query=""
        position={{ top: 0, left: 0 }}
        visible={true}
        onSelect={handleSelect}
        onClose={() => {}}
      />
    );

    // Simulate arrow down to select different channels
    fireEvent.keyDown(document, { key: 'ArrowDown', preventDefault: () => {} });
    fireEvent.keyDown(document, { key: 'Enter', preventDefault: () => {} });

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ 
        name: 'Random', 
        type: 'text' 
      })
    );
  });

  test('channel types are correctly identified', () => {
    render(<MockChannelAutocomplete />);

    // Verify channel type representations
    const voiceChannel = screen.getByText('🔊 #Voice Lounge');
    const announcementChannel = screen.getByText('📢 #Announcements');
    const textChannel = screen.getByText('#General');

    expect(voiceChannel).toBeInTheDocument();
    expect(announcementChannel).toBeInTheDocument();
    expect(textChannel).toBeInTheDocument();
  });

  test('mentions hook parses channel mentions', () => {
    const { result } = renderHook(() => useMentions('test-room'));

    const content = "Hey everyone, check out #general and #voice-lounge!";
    const { text, mentions } = result.current.parseMentions(content);

    expect(mentions).toHaveLength(2);
    expect(mentions[0]).toEqual(
      expect.objectContaining({
        displayName: 'General',
        type: 'channel',
      })
    );
    expect(mentions[1]).toEqual(
      expect.objectContaining({
        displayName: 'Voice Lounge',
        type: 'channel',
      })
    );
  });
});