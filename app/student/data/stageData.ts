export const getStageInfo = (
    stage: number
  ) => {
  
    if (stage <= 4) {
  
      return {
  
        title: "고조선 2 탐험",
  
        stages: [
  
          {
            emoji: "🌱",
            name: "고조선2-1",
          },
  
          {
            emoji: "⚔️",
            name: "고조선2-2",
          },
  
          {
            emoji: "📜",
            name: "고조선2-3",
          },
  
          {
            emoji: "👑",
            name: "고조선2-4",
          },
  
        ],
  
      };
    }
  
    if (stage <= 8) {
  
      return {
  
        title: "고구려 1 탐험",
  
        stages: [
  
          {
            emoji: "🐎",
            name: "고구려1-1",
          },
  
          {
            emoji: "🏹",
            name: "고구려1-2",
          },
  
          {
            emoji: "🛡️",
            name: "고구려1-3",
          },
  
          {
            emoji: "👑",
            name: "고구려1-4",
          },
  
        ],
  
      };
    }
  
    return {
  
      title: "새로운 탐험",
  
      stages: [
  
        {
          emoji: "❓",
          name: "준비중",
        },
  
      ],
  
    };
  };