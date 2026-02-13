# HAOS v2 Chat Components

Discord-style messaging interface with virtual scrolling and comprehensive message handling.

## Overview

This package provides a complete chat interface for HAOS v2, built with performance and Discord-like UX in mind.

### Components Built

#### ✅ Core Components
- **`ChatInterface`** - Complete chat experience combining all components
- **`MessageList`** - Virtual scrolling message list with grouping
- **`Message`** - Individual message with Discord-style formatting
- **`ChatInput`** - Already existed (Discord-style input with emoji/files)
- **`ChatHeader`** - Already existed (Channel header with controls)

#### ✅ Supporting Components  
- **`MessageActions`** - Already existed (Hover actions: react, reply, edit, delete)
- **`MessageAttachment`** - Already existed (Media handling: images, video, audio, files)

### Key Features Implemented

#### 🚀 Performance
- **Virtual Scrolling** - Uses `react-window` for efficient large message lists
- **Message Grouping** - Consecutive messages from same user are consolidated
- **Smart Estimation** - Dynamic height calculation for different message types
- **Optimized Rendering** - Only renders visible messages + small overscan

#### 🎨 Discord-Style UX
- **Message Grouping** - Avatar and username only on first message in group
- **Hover Actions** - React, reply, edit, delete on hover
- **Rich Formatting** - Markdown support, code blocks, quotes
- **Role Badges** - Admin/Moderator indicators with power levels
- **Bot Detection** - Special styling for bot users
- **Timestamps** - Relative display with hover for absolute time

#### 📱 Responsive Design
- **Mobile-Friendly** - Works on all screen sizes
- **Dark Mode** - Full dark theme support
- **Flexible Layout** - Configurable heights and sidebar toggles

#### 🔧 Developer Experience
- **TypeScript** - Full type safety throughout
- **Modular** - Each component can be used independently
- **Extensible** - Easy to customize and extend
- **Well-Documented** - Comprehensive JSDoc comments

## Usage Examples

### Complete Chat Interface
```tsx
import { ChatInterface } from '@/apps/web/components/chat';

function ChatPage({ roomId, currentUserId }) {
  return (
    <ChatInterface
      roomId={roomId}
      currentUserId={currentUserId}
      height="100vh"
      showMemberList={false}
      onMemberListToggle={() => setShowMembers(!showMembers)}
    />
  );
}
```

### Individual Components
```tsx
import { 
  MessageList, 
  Message, 
  ChatInput,
  ChatHeader 
} from '@/apps/web/components/chat';

// Custom chat layout
function CustomChat({ roomId }) {
  return (
    <div className="flex flex-col h-screen">
      <ChatHeader roomId={roomId} />
      <MessageList roomId={roomId} className="flex-1" />
      <ChatInput roomId={roomId} name="general" type="channel" />
    </div>
  );
}
```

### Message List Only
```tsx
import { MessageList } from '@/apps/web/components/chat';

function MessagesPanel({ roomId }) {
  return (
    <MessageList
      roomId={roomId}
      height={400}
      showActions={false}  // Read-only mode
      onReply={(event) => console.log('Reply to:', event)}
    />
  );
}
```

## Integration with Existing Code

### Matrix Hooks Used
- **`useRoomMessages`** - Message fetching with pagination
- **`useChatScroll`** - Scroll management and auto-scroll
- **`useRoom`** - Room metadata and member info
- **`useMxcUrl`** - Matrix content URL resolution

### Existing Services Used
- **`matrix-message`** - Send messages, files, reactions
- **`MessageAttachment`** - Media rendering
- **`MessageActions`** - Message interactions
- **`ChatInput`** - User input handling

## Performance Notes

### Virtual Scrolling
- Renders only ~10-15 visible messages + overscan
- Handles 1000s of messages without performance issues
- Dynamic height estimation for different message types
- Smooth scrolling with auto-scroll to bottom

### Message Grouping
- Groups consecutive messages within 5 minutes
- Reduces visual noise and improves readability
- Optimizes rendering by reducing avatars/usernames

### Memory Management
- Old messages outside viewport are unmounted
- Efficient React reconciliation with stable keys
- Minimal re-renders with proper memoization

## Testing

Run tests with:
```bash
npm run build  # Verify TypeScript compilation
npm run type-check  # Type checking only
```

## Future Enhancements

### Planned Features
- [ ] Message search within conversation
- [ ] Thread support (reply chains)
- [ ] Message reactions display
- [ ] Message editing UI
- [ ] Drag & drop file uploads
- [ ] Voice message support
- [ ] Improved mobile gestures

### Performance Improvements
- [ ] Intersection Observer for better scroll detection
- [ ] Message caching and persistence
- [ ] Image lazy loading optimization
- [ ] Bundle splitting for large media

## Architecture

### Component Hierarchy
```
ChatInterface
├── ChatHeader (existing)
├── MessageList (new)
│   └── Message (new)
│       ├── MessageActions (existing)
│       └── MessageAttachment (existing)
└── ChatInput (existing)
```

### Data Flow
```
useRoomMessages → MessageList → Message → MessageActions
                                    └── MessageAttachment
```

### Styling
- **Tailwind CSS** - Utility-first styling
- **Dark Mode** - Built-in theme support  
- **Discord Colors** - Consistent with Discord's design language
- **Responsive** - Mobile-first approach

Built with ❤️ for HAOS v2