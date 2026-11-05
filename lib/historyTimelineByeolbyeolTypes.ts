/** 공개 API에서 허용된 계정에만 전달하는 별별한국사 보충 설명 타입. */
export type ByeolbyeolLevel = "basic" | "advanced";
export type ByeolbyeolNote = {
  level: ByeolbyeolLevel;
  heading: string;
  points: string[];
};
