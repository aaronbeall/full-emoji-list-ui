import { useMemo, useState } from 'react';
import fullEmojiList, { type EmojiData } from 'full-emoji-list';
import './App.css';

// Patch missing emojis
fullEmojiList.forEach(emoji => {
  if (!emoji.Emoji) {
    console.log(`Patching missing emoji for`, emoji);
    emoji.Emoji = String.fromCodePoint(
      ...emoji.CodePointsHex.map(cp => parseInt(cp, 16))
    );
  }
  if (!emoji.Name) {
    console.log(`Patching missing name for`, emoji);
    emoji.Name = emoji.CodePointsHex.map(cp => cp.toLowerCase()).join("_");
  }
  if (!emoji.Version) {
    console.log(`Patching missing version for`, emoji);
    emoji.Version = "?";
  }
});

type EmojiItem = EmojiData & {
  id: string;
  variants?: EmojiVariant[];
}

type EmojiVariant = EmojiData & {
  variant: string;
}

type GroupedEmojis = Record<string, EmojiItem[]>;

const STATUSES = [
  'fully-qualified',
  'minimally-qualified',
  'unqualified',
  'component',
] as const;

function groupByGroup(list: EmojiItem[]): GroupedEmojis {
  return list.reduce((acc, emoji) => {
    const group = emoji.Group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(emoji);
    return acc;
  }, {} as GroupedEmojis);
}

function getBaseAndVariant(name: string) {
  const [base, variant, ...rest] = name.split(":");
  if (base && variant && !rest.length) {
    return [base, variant];
  }
  return [];
}

function App() {
  const [search, setSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(['fully-qualified'])
  );
  const [groupVariants, setGroupVariants] = useState(false);
  const [selectedEmojiId, setSelectedEmojiId] = useState<string | null>(null);

  const all = useMemo(() => 
    fullEmojiList.map<EmojiItem>(e => ({ ...e, id: e.CodePointsHex.join(",") })), 
  []);

  const grouped = useMemo(
    () => {
      const list = all.map(e => ({ ...e }));
      return groupByGroup(list);
    },
    [all, groupVariants]
  );

  const filtered = useMemo(() => {
    const result: GroupedEmojis = {};

    Object.entries(grouped).forEach(([group, emojis]) => {
      let list = emojis.filter(e =>
        selectedStatuses.has(e.Status || '')
      );

      if (groupVariants) {
        const baseVariants = new Map<string, EmojiVariant[]>();
        const isVariant = new Map<string, true>();

        list.forEach(e => {
          const [base, variant]  = getBaseAndVariant(e.Name);
          if (base && variant) {
            isVariant.set(e.Name, true);
            if (!baseVariants.has(base)) {
              baseVariants.set(base, []);
            }
            const baseEntry = baseVariants.get(base)!;
            baseEntry.push({
              ...e,
              variant,
            });
          }
        });

        // Ensure all variants have a base entry, insert one at the first variation position if not
        baseVariants.forEach((variants, base) => {
          if (variants.length > 0) {
            const hasBase = list.find(e => e.Name === base);
            if (!hasBase) {
              const firstVariant = variants[0];
              const baseEntry: EmojiItem = {
                ...firstVariant,
                id: `${base}`,
                Name: base,
                Emoji: firstVariant.Emoji, // Could be improved by generating base emoji from codepoints
                variants: [],
              };
              const insertIndex = list.findIndex(e => e.Name === firstVariant.Name);
              if (insertIndex >= 0) {
                list.splice(insertIndex, 0, baseEntry);
              } else {
                list.push(baseEntry);
              }
            }
          }
        });

        list = list.filter(e => !isVariant.has(e.Name));
        list.forEach(e => {
          const variants = baseVariants.get(e.Name);
          if (variants && variants.length > 1) {
            e.variants = variants;
          }
        });
      }

      if (list.length) result[group] = list;
    });

    return result;
  }, [grouped, selectedStatuses, groupVariants]);



  const selectedEmoji = useMemo(() => {
    if (!selectedEmojiId) return null;
    return Object.values(filtered).flat().find(e => e.id === selectedEmojiId) || null;
  }, [selectedEmojiId, filtered]);

  const searched = useMemo(() => {
    const lower = search.toLowerCase();
    const result: GroupedEmojis = {};

    const match = (e: EmojiData) => 
      e.Name.toLowerCase().includes(lower) ||
      e.SubGroup?.toLowerCase().includes(lower) ||
      e.Group?.toLowerCase().includes(lower) ||
      e.Emoji.includes(search) ||
      e.CodePointsHex.some(cp => cp.toLowerCase().includes(lower)) ||
      e.Version.toLowerCase().includes(lower)

    Object.entries(filtered).forEach(([group, emojis]) => {
      let list = emojis;

      if (search.trim()) {
        list = list.filter(e =>
          match(e) || (e.variants?.some(v => match(v)))
        );
      }

      if (list.length) result[group] = list;
    });

    return result;
  }, [filtered, search]);

  function toggleStatus(status: string) {
    setSelectedStatuses(prev => {
      const next = new Set(prev);
      next.has(status) ? next.delete(status) : next.add(status);
      return next;
    });
  }

  const emojiCount = useMemo(() => Object.values(filtered).flat().length, [filtered]);

  const groups = useMemo(() => {
    // Tree of all groups and their subgroups
    return Object.keys(grouped).reduce((acc, group) => {
      acc[group] = [...new Set(all.filter(e => e.Group === group).map(e => e.SubGroup || 'Other'))];
      return acc;
    }, {} as Record<string, string[]>);
    
  }, [searched]);

  return (
    <div className="emoji-app">
      <header className="emoji-header">
        <h2><code>full-emoji-list</code> ({ emojiCount })</h2>

        <div className='emoji-search'>
          <input
            className="emoji-search-input"
            placeholder="Search emojis…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="emoji-search-icon">🔎</span>
          { search && <button className='emoji-search-clear' onClick={() => setSearch('')}>Clear</button> }
        </div>

        <div className="controls">
          <fieldset>
            <legend>Status</legend>
            {STATUSES.map(status => (
              <label key={status}>
                <input
                  type="checkbox"
                  checked={selectedStatuses.has(status)}
                  onChange={() => toggleStatus(status)}
                />
                {status}
              </label>
            ))}
          </fieldset>

          <label className="variants-toggle">
            <input
              type="checkbox"
              checked={groupVariants}
              onChange={e => setGroupVariants(e.target.checked)}
            />
            Group variants
          </label>

          <fieldset>
            <legend>Groups</legend>
            {Object.entries(groups).map(([group, subgroups]) => (
                <button onClick={() => setSearch(prev => prev == group ? "" : group)} title={subgroups.join(', ')}>{group}</button>
            ))}
          </fieldset>

          {
            Object.entries(groups).map(([group, subgroups]) => (
              group.toLowerCase() == search.toLowerCase() && (
                <fieldset key={group}>
                  <legend>SubGroups of {group}</legend>
                  {subgroups.map(subgroup => (
                    <button key={`${group}-${subgroup}`} onClick={() => setSearch(prev => prev == subgroup ? "" : subgroup)} title={group}>{subgroup}</button>
                  ))}
                </fieldset>
              )
            ))
          }
        </div>

        {selectedEmoji && (
          <div className="emoji-info">
            <button className="emoji-info-close" onClick={() => setSelectedEmojiId(null)}>Close</button>
            <table className="emoji-info-table">
              <tbody>
                <tr>
                  <th>Emoji</th>
                  <td style={{fontSize: "2em"}}>{selectedEmoji.Emoji}</td>
                </tr>
                <tr>
                  <th>Name</th>
                  <td>{selectedEmoji.Name}</td>
                </tr>
                <tr>
                  <th>Version</th>
                  <td>{selectedEmoji.Version}</td>
                </tr>
                <tr>
                  <th>CodePointsHex</th>
                  <td>{selectedEmoji.CodePointsHex.join(', ')}</td>
                </tr>
                <tr>
                  <th>Status</th>
                  <td>{selectedEmoji.Status}</td>
                </tr>
                {selectedEmoji.Group && (
                  <tr>
                    <th>Group</th>
                    <td>{selectedEmoji.Group}</td>
                  </tr>
                )}
                {selectedEmoji.SubGroup && (
                  <tr>
                    <th>SubGroup</th>
                    <td>{selectedEmoji.SubGroup}</td>
                  </tr>
                )}
                {selectedEmoji.variants && (
                  <tr>
                    <th>Variants</th>
                    <td>
                      {selectedEmoji.variants.map(variant => (
                        <button key={variant.Name} title={`${variant.Emoji} ${variant.variant} (${variant.Status})`} onClick={() => setSearch(variant.variant)}>
                          {variant.Emoji}
                        </button>
                      ))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </header>

      <main className="emoji-scroll">
        {Object.entries(searched).map(([group, emojis]) => (
          <section key={group} className="emoji-group">
            <h2>{group} ({emojis.length})</h2>
            <div className="emoji-grid">
              {emojis.map((emoji, i) => (
                <button
                  key={`${emoji.Emoji}-${i}`}
                  className="emoji-item"
                  title={emoji.Name}
                  onClick={() => setSelectedEmojiId(emoji.id)}
                >
                  {(emoji.variants?.find(v => v.variant === search)?.Emoji) ?? emoji.Emoji}
                  {!!emoji.variants && (
                    <span className="variant-dot" />
                  )}
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

export default App;
