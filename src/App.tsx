import { useState, useMemo } from 'react';
import fullEmojiList, { type EmojiData } from 'full-emoji-list';
import './App.css';

type GroupedEmojis = Record<string, EmojiData[]>;

function groupEmojisByGroup(list: EmojiData[]): GroupedEmojis {
  return list.reduce((acc, emoji) => {
    const group = emoji.Group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(emoji);
    return acc;
  }, {} as GroupedEmojis);
}

function App() {
  const [search, setSearch] = useState('');

  const grouped = useMemo(
    () => groupEmojisByGroup(fullEmojiList),
    []
  );

  const filteredGrouped = useMemo(() => {
    if (!search.trim()) return grouped;

    const lower = search.toLowerCase();
    const result: GroupedEmojis = {};

    Object.entries(grouped).forEach(([group, emojis]) => {
      const filtered = emojis.filter(e =>
        e.Name?.toLowerCase().includes(lower) ||
        e.Emoji?.includes(lower) ||
        e.SubGroup?.toLowerCase().includes(lower)
      );

      if (filtered.length) {
        result[group] = filtered;
      }
    });

    return result;
  }, [search, grouped]);

  return (
    <div className="emoji-app">
      <h1>Emoji Search</h1>

      <input
        type="text"
        placeholder="Search emojis…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="emoji-search"
      />

      <div className="emoji-groups">
        {Object.entries(filteredGrouped).map(([group, emojis]) => (
          <section key={group} className="emoji-group">
            <h2 className="emoji-group-title">{group}</h2>

            <div className="emoji-grid">
              {emojis.map((emoji, index) => (
                <button
                  key={`${emoji.Emoji}-${index}`}
                  className="emoji-item"
                  title={emoji.Name}
                  aria-label={emoji.Name}
                  type="button"
                >
                  {emoji.Emoji}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default App;
