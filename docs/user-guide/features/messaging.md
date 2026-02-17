# Messaging & Chat

Master the art of communication on Melo with our comprehensive messaging features, from basic chat to advanced formatting and rich media sharing.

## 💬 Basic Messaging

### Sending Your First Message

1. **Click in the message box** at the bottom of any text channel
2. **Type your message**
3. **Press Enter** to send, or **Shift+Enter** for a new line
4. **Your message appears** in the channel for everyone to see

### Message Composition

**Text Input Features:**
- **Auto-complete** - Type `@` for users, `#` for channels, `:` for emoji
- **Draft saving** - Your message drafts persist between sessions
- **Multi-line support** - Shift+Enter for line breaks
- **Character limit** - Up to 2,000 characters per message

**Smart Features:**
- **Link previews** automatically generated
- **Spell check** with suggestions
- **Typing indicators** show when others are typing
- **Message predictions** for common responses

## ✨ Rich Text Formatting

### Markdown Support

Melo supports full Markdown formatting:

| Format | Syntax | Result |
|--------|--------|--------|
| **Bold** | `**text**` or `__text__` | **bold text** |
| *Italic* | `*text*` or `_text_` | *italic text* |
| ~~Strikethrough~~ | `~~text~~` | ~~crossed out~~ |
| `Code` | `` `text` `` | `inline code` |
| Spoiler | `\|\|text\|\|` | Hidden text (click to reveal) |

### Code Blocks

**Single Line Code:**
```
`console.log("Hello World!");`
```

**Multi-line Code Blocks:**
````
```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
}
```
````

**Supported Languages:**
- JavaScript, Python, Java, C++, HTML, CSS
- JSON, XML, SQL, Bash, PowerShell
- And many more with syntax highlighting

### Advanced Formatting

**Quotes:**
```
> This is a single line quote
>>> This is a
multi-line quote
that continues
```

**Lists:**
```
- Bullet point 1
- Bullet point 2
  - Nested bullet
```

**Links:**
- Auto-detection: `https://example.com`
- Markdown links: `[Link Text](https://example.com)`
- Channel links: `#channel-name`
- User mentions: `@username`

## 😀 Emoji & Reactions

### Using Emoji

**Standard Emoji:**
- Use your system's emoji picker
- Type `:smile:` for emoji shortcodes
- Recent emoji for quick access
- Skin tone modifiers supported

**Custom Server Emoji:**
- Upload custom emoji (server boost required)
- Type `:custom_name:` to use
- Animated emoji support (GIF format)
- Server-specific emoji collections

### Message Reactions

**Adding Reactions:**
- **Hover over message** → click emoji button
- **Right-click message** → "Add Reaction"
- **Quick reactions** - common emoji shortcuts
- **Custom reactions** using server emoji

**Reaction Features:**
- **Multiple reactions** per message
- **Reaction counts** show popularity
- **Remove reactions** by clicking them again
- **Reaction notifications** for your messages

## 📁 File Sharing & Attachments

### Uploading Files

**Drag & Drop:**
1. Drag files from your computer
2. Drop them in the message box
3. Add a message (optional)
4. Press Enter to send

**Upload Button:**
1. Click the **+** button or paperclip icon
2. Select files from your computer
3. Choose multiple files if needed
4. Add comments and send

### Supported File Types

**Images:**
- PNG, JPG, GIF, WebP
- Automatic image previews
- Image compression for large files
- Alt text support for accessibility

**Videos:**
- MP4, MOV, AVI, WebM
- Inline video player
- Thumbnail generation
- Progress indicators

**Documents:**
- PDF, DOC, TXT, RTF
- File preview for common types
- Download links for all files
- Virus scanning protection

### File Limits & Restrictions

| Account Type | Max File Size | Monthly Bandwidth |
|--------------|---------------|-------------------|
| Free | 8 MB | 100 GB |
| Basic | 25 MB | 500 GB |
| Premium | 100 MB | Unlimited |

**Security Features:**
- Automatic virus scanning
- Blocked file type restrictions
- Content filtering for inappropriate media
- Encryption in transit and at rest

## 🔗 Link Previews & Embeds

### Automatic Link Previews

**Supported Platforms:**
- YouTube videos with inline players
- Twitter/X posts with full thread support
- GitHub repositories and issues
- Spotify music with playback
- Website previews with titles and descriptions

**Preview Controls:**
- **Suppress previews** by wrapping links in `<>`
- **Edit after sending** to adjust preview visibility
- **Admin controls** for allowed preview domains
- **NSFW content** automatically hidden

### Custom Embeds

**For Developers:**
- Rich embed API support
- Custom webhook formatting
- Bot-generated embeds
- Interactive message components

## ✏️ Message Management

### Editing Messages

**How to Edit:**
1. **Right-click** your message → "Edit Message"
2. **Up arrow key** in empty message box (edits last message)
3. **Click the edit button** (appears on hover)
4. Make changes and **Enter** to save

**Edit Features:**
- **Edit history** preserved for moderation
- **"Edited" indicator** shows message was modified
- **Time limit** for edits (configurable by server)
- **No edit limits** on direct messages

### Deleting Messages

**Delete Your Own Messages:**
- Right-click → "Delete Message"
- Confirm deletion in popup
- **Permanent deletion** - cannot be undone
- **Bulk delete** option for multiple messages

**Moderation Tools:**
- Moderators can delete any message
- **Audit log** tracks all deletions
- **Bulk delete** tools for cleanup
- **Auto-delete** for rule violations

### Message History

**Search Features:**
- **Search bar** for finding old messages
- **Filter by user, date, content type**
- **Jump to message** from search results
- **Message permalinks** for sharing specific messages

**Backup & Export:**
- **Personal data export** available
- **Server backup** tools for admins
- **Message archiving** for important conversations
- **GDPR compliance** with full data portability

## 🔔 Notifications & Mentions

### Types of Mentions

**Direct Mentions:**
- `@username` - notifies specific user
- Highlighted in blue with notification
- Shows up in mentions tab
- Mobile push notification (if enabled)

**Role Mentions:**
- `@role` - notifies all users with that role
- Requires permission to use
- Color-coded by role
- Configurable notification settings

**Channel Mentions:**
- `#channel-name` - creates clickable link
- No notification sent
- Easy navigation between channels
- Works across servers

**Special Mentions:**
- `@here` - notifies only online members
- `@everyone` - notifies all server members
- Requires special permissions
- Use sparingly to avoid spam

### Managing Notifications

**Per-Server Settings:**
- **All Messages** - notify for every message
- **Only @mentions** - notify only when mentioned
- **Nothing** - no notifications from this server
- **Override** for specific channels

**Keyword Notifications:**
- Set custom keywords that trigger notifications
- Case-insensitive matching
- Regular expression support
- Highlight matching terms

**Do Not Disturb Mode:**
- Suppress all notifications temporarily
- Scheduled quiet hours
- Important mentions only
- Mobile notification sync

## 🎯 Advanced Messaging Features

### Message Threading

**Thread Creation:**
1. **Right-click message** → "Create Thread"
2. **Give thread a name** and description
3. **Invite relevant participants**
4. **Continue discussion** in focused environment

**Thread Benefits:**
- **Organized discussions** without channel clutter
- **Focused conversations** on specific topics
- **Easy to follow** complex discussions
- **Searchable** and archivable

### Scheduled Messages

**Planning Ahead:**
- **Compose message** as normal
- **Click schedule icon** instead of send
- **Choose date and time** for delivery
- **Edit or cancel** before it sends

**Use Cases:**
- Meeting reminders
- Event announcements
- Time zone coordination
- Planned social media posts

### Message Templates

**Quick Responses:**
- **Save frequently used messages** as templates
- **Keyboard shortcuts** for common responses
- **Variable insertion** for personalization
- **Team templates** for consistent communication

**Template Categories:**
- Meeting invitations
- Status updates
- FAQ responses
- Welcome messages

## 📱 Mobile Messaging

### Mobile-Specific Features

**Gesture Controls:**
- **Swipe left** on message for quick reply
- **Long press** for message options menu
- **Double tap** to quick-react with ❤️
- **Pull to refresh** channel

**Voice Messages:**
- **Hold microphone button** to record
- **Slide to cancel** recording
- **Automatic transcription** available
- **Playback speed controls**

**Mobile Keyboard:**
- **Swipe typing** support
- **Voice-to-text** input
- **Emoji suggestions** while typing
- **Auto-correct** integration

### Offline Functionality

**Message Sync:**
- **Download messages** for offline reading
- **Queue outgoing messages** when offline
- **Automatic sync** when connection restored
- **Conflict resolution** for simultaneous edits

## ⚙️ Message Settings & Preferences

### Appearance Customization

**Font Settings:**
- **Font size** adjustment (12px - 20px)
- **Font family** selection
- **Message density** (compact/cozy/spacious)
- **Line height** adjustment

**Color & Themes:**
- **Message highlighting** for mentions
- **Custom accent colors**
- **High contrast mode** for accessibility
- **Dark/light theme** integration

### Accessibility Features

**Screen Reader Support:**
- **Semantic markup** for proper navigation
- **Alt text** for images and emoji
- **Keyboard-only** navigation
- **Focus management** for modal dialogs

**Visual Accessibility:**
- **High contrast themes**
- **Reduced motion** options
- **Colorblind-friendly** color schemes
- **Adjustable text size** and spacing

---

**Next Steps:**
- Learn about [Voice & Video Calls](./voice-video.md)
- Explore [File Sharing](./file-sharing.md) in detail
- Master [Servers & Channels](./servers-channels.md) management

**Pro Tips:**
- Use keyboard shortcuts for faster messaging
- Set up keyword notifications for important topics
- Customize your notification settings per server
- Try voice messages for more personal communication