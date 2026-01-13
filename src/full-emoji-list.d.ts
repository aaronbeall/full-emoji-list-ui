declare module 'full-emoji-list' {
  export interface EmojiData {
    Emoji: string
    Name: string
    Version: string;
    CodePointsHex: string[];
    Status: 'fully-qualified' | 'minimally-qualified' | 'unqualified' | 'component';
    Group?: string
    SubGroup?: string
  }

  const emojiList: EmojiData[]
  export default emojiList
}
