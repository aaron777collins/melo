# Troubleshooting Guide

Having issues with HAOS? This comprehensive troubleshooting guide will help you resolve common problems and get back to chatting with your community.

## 🚨 Quick Fixes

Try these simple solutions first - they resolve 80% of common issues:

### Universal Solutions
1. **Refresh/Restart** - Refresh browser or restart app
2. **Check Internet** - Ensure stable internet connection
3. **Update App** - Make sure you're running the latest version
4. **Clear Cache** - Clear browser cache or app data
5. **Disable Extensions** - Turn off browser extensions temporarily

### Platform-Specific Quick Fixes

**Web Browser:**
- Press **Ctrl+Shift+R** (hard refresh)
- Try **incognito/private mode**
- **Clear cookies** for HAOS domain
- **Disable ad blockers** temporarily

**Desktop App:**
- **Restart the application** completely
- **Run as administrator** (Windows)
- **Reset audio settings** to defaults
- **Check firewall permissions**

**Mobile App:**
- **Force close** and reopen the app
- **Restart your device**
- **Check app permissions** (mic, camera, notifications)
- **Free up storage space**

## 🔍 Common Issues

### 🔐 [Login & Account Issues](./common-issues.md#login-account)
- Can't sign in or forgot password
- Account verification problems
- Two-factor authentication issues
- Profile not loading properly

### 🌐 [Connection Problems](./connection-problems.md)
- Can't connect to servers
- Frequent disconnections
- Slow loading or timeouts
- Regional server issues

### 🎙️ [Audio/Video Issues](./audio-video-issues.md)
- Microphone not working
- No sound from others
- Video not displaying
- Poor audio/video quality

### 📱 [Mobile App Issues](./mobile-issues.md)
- App crashes or freezes
- Notification problems
- Battery drain issues
- Touch/gesture problems

### 💬 [Messaging Issues](./common-issues.md#messaging)
- Messages not sending
- Files not uploading
- Emoji not displaying
- Search not working

### 🏢 [Server & Channel Issues](./common-issues.md#servers)
- Can't join servers
- Missing channels or permissions
- Invite links not working
- Server loading problems

## 🩺 Diagnostic Tools

### Built-in Diagnostics

**Connection Test:**
1. Go to **User Settings** → **Voice & Video**
2. Click **"Test Microphone"** and **"Test Speakers"**
3. Run **"Connection Test"** to check network quality
4. Review results and suggested fixes

**Debug Information:**
1. Press **Ctrl+Shift+I** (browser) or check app logs
2. Look for error messages or warnings
3. Note timing of issues for support
4. Take screenshots of error messages

### Network Diagnostics

**Speed Test:**
- Minimum required: 1 Mbps upload/download
- Recommended: 3+ Mbps for video calls
- Test at [speedtest.net](https://speedtest.net) or similar

**Connectivity Check:**
```
ping discord.com
nslookup discord.com
tracert discord.com (Windows) / traceroute discord.com (Mac/Linux)
```

## 🔧 Step-by-Step Solutions

### When HAOS Won't Load

**Step 1: Browser Issues**
1. Clear browser cache and cookies
2. Disable all browser extensions
3. Try a different browser (Chrome, Firefox, Safari)
4. Check if JavaScript is enabled

**Step 2: Network Issues**
1. Test internet connection on other sites
2. Restart your router/modem
3. Try a different network (mobile hotspot)
4. Check if HAOS is blocked by firewall

**Step 3: Account Issues**
1. Verify you're using correct login credentials
2. Check if your account is suspended
3. Try logging in on a different device
4. Contact support if account issues persist

### When Voice Chat Doesn't Work

**Step 1: Permissions**
1. **Browser**: Check microphone permissions for the website
2. **Desktop**: Ensure app has microphone access
3. **Mobile**: Check app permissions in device settings
4. **Windows**: Check Windows privacy settings

**Step 2: Device Selection**
1. Go to **Voice & Video Settings**
2. Select correct input/output devices
3. Test microphone levels
4. Adjust sensitivity if needed

**Step 3: Audio Drivers**
1. **Windows**: Update audio drivers via Device Manager
2. **Mac**: Check System Preferences → Sound
3. **Linux**: Verify ALSA/PulseAudio configuration
4. Restart after driver updates

### When Messages Don't Send

**Step 1: Basic Checks**
1. Check internet connection stability
2. Verify you have send permissions in channel
3. Ensure message isn't too long (2000 char limit)
4. Check if you're rate limited

**Step 2: Clear Data**
1. **Browser**: Clear site data for HAOS
2. **Desktop**: Clear app cache in settings
3. **Mobile**: Clear app cache in device settings
4. Log out and back in

**Step 3: Alternative Methods**
1. Try sending from different device
2. Use different internet connection
3. Try voice message instead of text
4. Contact server moderators

## 📊 Error Messages & Codes

### Common Error Messages

**"Unable to Connect"**
- **Cause**: Network connectivity issues
- **Solution**: Check internet, restart router, try different network

**"Authentication Failed"**
- **Cause**: Login credential issues
- **Solution**: Reset password, check 2FA, verify email

**"Rate Limited"**
- **Cause**: Too many actions too quickly
- **Solution**: Wait 10-60 seconds, slow down actions

**"Insufficient Permissions"**
- **Cause**: Account lacks required permissions
- **Solution**: Contact server moderators for role assignment

**"Server Unavailable"**
- **Cause**: Server maintenance or issues
- **Solution**: Wait and try again, check status page

### HTTP Error Codes

**400 Bad Request**
- Malformed request, usually temporary
- Refresh page or restart app

**401 Unauthorized**
- Authentication expired
- Log out and log back in

**403 Forbidden**
- Insufficient permissions
- Contact server administrators

**404 Not Found**
- Server, channel, or user doesn't exist
- Check invite links and permissions

**429 Too Many Requests**
- Rate limiting in effect
- Wait before trying again

**500 Internal Server Error**
- Server-side issue
- Wait and try again later

## 🆘 Getting Help

### Self-Service Resources

**Documentation:**
- [Feature Guides](../features/README.md) - Learn how features work
- [Settings Guide](../settings/README.md) - Customize your experience
- [FAQ Section](#faq) - Answers to common questions

**Community Support:**
- Official support server
- Community forums
- User-generated guides
- Video tutorials

### Contacting Support

**When to Contact Support:**
- Account-specific issues
- Payment/billing problems
- Report abuse or harassment
- Persistent technical issues

**How to Contact:**
1. **In-app support** - Settings → Support
2. **Email support** - support@haos.app
3. **Support server** - Join our official support community
4. **Social media** - @HAOSSupport on Twitter

**Information to Include:**
- Detailed description of the issue
- Steps to reproduce the problem
- Your operating system and app version
- Screenshots or error messages
- When the issue started

### Escalation Process

**Tier 1: Community Support**
- User forums and community help
- Peer-to-peer assistance
- Basic troubleshooting

**Tier 2: Technical Support**
- Official support team
- Technical issue resolution
- Account-related problems

**Tier 3: Engineering Support**
- Complex technical issues
- Bug reports and feature requests
- Infrastructure problems

## 📋 Maintenance & Status

### Checking System Status

**Official Status Page:**
- Visit [status.haos.app](https://status.haos.app)
- Check for ongoing incidents
- Subscribe to status updates
- View historical uptime

**Social Media Updates:**
- [@HAOSStatus](https://twitter.com/HAOSStatus) on Twitter
- Official announcements
- Maintenance schedules
- Real-time updates

### Scheduled Maintenance

**Maintenance Windows:**
- Usually during low-usage hours
- Advance notice via status page
- Email notifications for major updates
- Alternative access methods when possible

**During Maintenance:**
- Some features may be limited
- Voice/video quality might be affected
- Message delivery could be delayed
- Mobile apps may need updates

## ❓ Frequently Asked Questions

### Account & Security

**Q: How do I change my password?**
A: Go to User Settings → Account → Change Password. You'll need your current password.

**Q: Can I recover a deleted account?**
A: Account deletion is permanent after 30 days. Contact support immediately if deleted by mistake.

**Q: How do I enable two-factor authentication?**
A: User Settings → Privacy & Security → Enable 2FA. Use an authenticator app like Google Authenticator.

### Technical Issues

**Q: Why is my voice cutting out?**
A: Check your internet connection, microphone levels, and voice activity settings. Try push-to-talk mode.

**Q: Why can't I see some channels?**
A: You might lack the required roles or permissions. Contact server moderators for access.

**Q: How do I report a bug?**
A: Use the in-app feedback system or contact support with detailed reproduction steps.

### Mobile Specific

**Q: Why does the app drain my battery?**
A: Background refresh, location services, and notifications can impact battery. Adjust settings in app preferences.

**Q: Why aren't I getting notifications?**
A: Check device notification settings, app permissions, and Do Not Disturb mode.

---

**Need More Help?**

If you can't find a solution here:
1. Check our detailed guides for specific issues
2. Join our support community for peer help
3. Contact our support team with detailed information
4. Follow [@HAOSSupport](https://twitter.com/HAOSSupport) for updates

**Quick Navigation:**
- [Common Issues](./common-issues.md) → Detailed solutions
- [Connection Problems](./connection-problems.md) → Network troubleshooting
- [Audio/Video Issues](./audio-video-issues.md) → Voice/video help
- [Mobile Issues](./mobile-issues.md) → Mobile-specific problems