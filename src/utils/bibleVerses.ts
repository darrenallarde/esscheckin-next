// Inspiring Bible verses about God's goodness, Jesus, and prayer

export interface BibleVerse {
  text: string;
  reference: string;
  theme: 'goodness' | 'jesus' | 'prayer' | 'faith' | 'love';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  points: number;
  type: string;
  condition: () => boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const BIBLE_VERSES: BibleVerse[] = [
  // God's Goodness
  {
    text: "Taste and see that the Lord is good; blessed is the one who takes refuge in him.",
    reference: "Psalm 34:8",
    theme: "goodness"
  },
  {
    text: "Every good and perfect gift is from above, coming down from the Father of the heavenly lights.",
    reference: "James 1:17",
    theme: "goodness"
  },
  {
    text: "The Lord is good to all; he has compassion on all he has made.",
    reference: "Psalm 145:9",
    theme: "goodness"
  },
  {
    text: "Give thanks to the Lord, for he is good; his love endures forever.",
    reference: "Psalm 107:1",
    theme: "goodness"
  },

  // About Jesus
  {
    text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
    reference: "John 3:16",
    theme: "jesus"
  },
  {
    text: "Jesus said, 'I am the way and the truth and the life. No one comes to the Father except through me.'",
    reference: "John 14:6",
    theme: "jesus"
  },
  {
    text: "Come to me, all you who are weary and burdened, and I will give you rest.",
    reference: "Matthew 11:28",
    theme: "jesus"
  },
  {
    text: "I can do all this through him who gives me strength.",
    reference: "Philippians 4:13",
    theme: "jesus"
  },
  {
    text: "And surely I am with you always, to the very end of the age.",
    reference: "Matthew 28:20",
    theme: "jesus"
  },

  // Power of Prayer
  {
    text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.",
    reference: "Philippians 4:6",
    theme: "prayer"
  },
  {
    text: "Call to me and I will answer you and tell you great and unsearchable things you do not know.",
    reference: "Jeremiah 33:3",
    theme: "prayer"
  },
  {
    text: "The prayer of a righteous person is powerful and effective.",
    reference: "James 5:16",
    theme: "prayer"
  },
  {
    text: "Ask and it will be given to you; seek and you will find; knock and the door will be opened to you.",
    reference: "Matthew 7:7",
    theme: "prayer"
  },

  // Faith & Love
  {
    text: "And we know that in all things God works for the good of those who love him.",
    reference: "Romans 8:28",
    theme: "love"
  },
  {
    text: "Trust in the Lord with all your heart and lean not on your own understanding.",
    reference: "Proverbs 3:5",
    theme: "faith"
  },
  {
    text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
    reference: "Joshua 1:9",
    theme: "faith"
  },
  {
    text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud.",
    reference: "1 Corinthians 13:4",
    theme: "love"
  },
  {
    text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.",
    reference: "Jeremiah 29:11",
    theme: "goodness"
  },
  {
    text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles.",
    reference: "Isaiah 40:31",
    theme: "faith"
  }
];

export function getRandomVerse(): BibleVerse {
  return BIBLE_VERSES[Math.floor(Math.random() * BIBLE_VERSES.length)];
}

export function getVerseByTheme(theme: BibleVerse['theme']): BibleVerse {
  const versesForTheme = BIBLE_VERSES.filter(verse => verse.theme === theme);
  return versesForTheme[Math.floor(Math.random() * versesForTheme.length)];
}
