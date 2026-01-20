# 🎛️ doerdMIDI - Electronic Live Set Planner

Professional live set planning tool for electronic music producers and DJs.

## FILES STRUCTURE
```bash
doerdMIDI-LiveSetPlanner/
├── index.html
├── css/
│   ├── liveset-main.css
│   ├── liveset-performance.css
│   └── liveset-animations.css
├── js/
│   ├── liveset-data-structures.js
│   ├── liveset-storage.js
│   ├── liveset-controller.js
│   ├── liveset-ui.js
│   ├── liveset-performance.js
│   └── liveset-app.js
├── examples/
│   ├── example-liveset-techno-night.json
│   └── example-liveset-house-warmup.json
└── README.md
```

## ✨ Features

### Track Management
- Unlimited tracks per set
- Detailed track metadata (BPM, Key, Energy, Duration)
- Drag & drop track reordering
- Auto-arrange by energy level
- Color coding

### Channel Configuration
8 Channel Types with specific attributes:
- **Drums** - Plugin, preset, patterns, swing
- **Synth** - Lead/Bass/Pad with full synthesis parameters
- **External Hardware** - MIDI/CV routing, audio channels
- **Percussion** - Grooves and patterns
- **Vocal/Samples** - Time-stretching, processing chains
- **FX/Send** - Effects routing and automation
- **Automation Lanes** - Parameter automation curves
- **Master/Bus** - Mix bus configuration

### Performance Mode
- **Live Timer** - Track and set duration with visual countdown
- **Auto-advance** - Automatically move to next track when time expires
- **10-Second Warning** - Visual and animated warnings
- **Arrangement Display** - See current section (Intro/Build/Drop/etc.)
- **Active Channels View** - Monitor all active channels
- **Upcoming Tracks** - Preview next 3 tracks
- **Performance Notes** - Track-specific and transition notes
- **Keyboard Controls**:
  - Space: Play/Pause
  - Arrow Left: Previous track
  - Arrow Right: Next track
  - Escape: Exit performance mode

### Data Management
- IndexedDB local storage
- Auto-save every 30 seconds
- Import/Export individual sets (JSON)
- Bulk export all data
- No data loss on refresh

## 🚀 Getting Started

1. **Create a Live Set**
   - Click "New Set" in sidebar
   - Name your set
   - Set master BPM

2. **Add Tracks**
   - Click "+ Add Track"
   - Configure track details (name, BPM, key, duration, energy)
   - Add channels for each sound/instrument
   - Set arrangement sections

3. **Configure Channels**
   - Click "+ Add Channel"
   - Select channel type
   - Fill in type-specific details
   - Add performance notes

4. **Enter Performance Mode**
   - Click "🎭 Performance Mode"
   - Press Space to start timer
   - Navigate with arrow keys
   - Monitor time and upcoming tracks

## 📋 Keyboard Shortcuts

- **Ctrl/Cmd + S**: Save current set
- **In Performance Mode**:
  - Space: Play/Pause
  - ← / →: Previous/Next track
  - Escape: Exit

## 💾 Data Storage

All data is stored locally in your browser using IndexedDB:
- No internet required after initial load
- Data persists across sessions
- Export JSON for backup/sharing

## 🎯 Use Cases

- **Live PA Sets** - Plan your full live performance
- **DJ Sets** - Organize DJ sets with detailed notes
- **Studio Sessions** - Document your production workflow
- **Rehearsals** - Practice with time constraints
- **Gig Preparation** - Prepare detailed performance plans

## 🔧 Browser Compatibility

- Chrome 90+ ✅
- Edge 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅

## 📱 Mobile Support

Fully responsive design works on:
- Desktop (optimal experience)
- Tablets (touch-optimized)
- Mobile phones (compact view)

## 🎨 Customization

- Track colors for visual organization
- Flexible energy levels (1-10 scale)
- Custom arrangement sections
- Unlimited genre tags

## 💡 Pro Tips

1. **Energy Flow**: Use auto-arrange to create natural energy progression
2. **Transitions**: Document transition techniques between tracks
3. **Time Management**: Set realistic track durations for timing practice
4. **Channel Detail**: More channel detail = better preparation
5. **Backup**: Export your sets regularly

## 🐛 Troubleshooting

**Data not saving?**
- Check browser storage permissions
- Ensure IndexedDB is enabled
- Try clearing browser cache

**Performance mode not starting?**
- Add at least one track to your set
- Check that track has valid duration

**Import failed?**
- Validate JSON format
- Ensure file is from this tool

## 📄 License

MIT License - Free for personal and commercial use

## 🙏 Credits

Created by doerdMIDI
Built for electronic music producers worldwide

