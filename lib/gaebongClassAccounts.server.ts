export type GaebongClassAccount = {
  classNumber: number;
  nickname: string;
  accountId: string;
  temporaryPassword: string;
};

const GAEBONG_G6_C2_ACCOUNTS: GaebongClassAccount[] = [
  { classNumber: 1, nickname: "GBG6C2N01", accountId: "GBG6C2N0105551", temporaryPassword: "201243" },
  { classNumber: 2, nickname: "GBG6C2N02", accountId: "GBG6C2N0239383", temporaryPassword: "798797" },
  { classNumber: 3, nickname: "GBG6C2N03", accountId: "GBG6C2N0309073", temporaryPassword: "326323" },
  { classNumber: 4, nickname: "GBG6C2N04", accountId: "GBG6C2N0485481", temporaryPassword: "798797" },
  { classNumber: 5, nickname: "GBG6C2N05", accountId: "GBG6C2N0530114", temporaryPassword: "574575" },
  { classNumber: 6, nickname: "GBG6C2N06", accountId: "GBG6C2N0664424", temporaryPassword: "487484" },
  { classNumber: 7, nickname: "GBG6C2N07", accountId: "GBG6C2N0709036", temporaryPassword: "859858" },
  { classNumber: 8, nickname: "GBG6C2N08", accountId: "GBG6C2N0886727", temporaryPassword: "798797" },
  { classNumber: 9, nickname: "GBG6C2N09", accountId: "GBG6C2N0920057", temporaryPassword: "201202" },
  { classNumber: 10, nickname: "GBG6C2N10", accountId: "GBG6C2N1076669", temporaryPassword: "201202" },
  { classNumber: 11, nickname: "GBG6C2N11", accountId: "GBG6C2N1199471", temporaryPassword: "130131" },
  { classNumber: 12, nickname: "GBG6C2N12", accountId: "GBG6C2N1228644", temporaryPassword: "859858" },
  { classNumber: 13, nickname: "GBG6C2N13", accountId: "GBG6C2N1335239", temporaryPassword: "487484" },
  { classNumber: 14, nickname: "GBG6C2N14", accountId: "GBG6C2N1408581", temporaryPassword: "130131" },
  { classNumber: 15, nickname: "GBG6C2N15", accountId: "GBG6C2N1510839", temporaryPassword: "326323" },
  { classNumber: 16, nickname: "GBG6C2N16", accountId: "GBG6C2N1627117", temporaryPassword: "612616" },
  { classNumber: 17, nickname: "GBG6C2N17", accountId: "GBG6C2N1763463", temporaryPassword: "130131" },
  { classNumber: 18, nickname: "GBG6C2N18", accountId: "GBG6C2N1803313", temporaryPassword: "326323" },
  { classNumber: 19, nickname: "GBG6C2N19", accountId: "GBG6C2N1935195", temporaryPassword: "487484" },
  { classNumber: 20, nickname: "GBG6C2N20", accountId: "GBG6C2N2035539", temporaryPassword: "130131" },
  { classNumber: 21, nickname: "GBG6C2N21", accountId: "GBG6C2N2191186", temporaryPassword: "612616" },
  { classNumber: 22, nickname: "GBG6C2N22", accountId: "GBG6C2N2279448", temporaryPassword: "326323" },
  { classNumber: 23, nickname: "GBG6C2N23", accountId: "GBG6C2N2300716", temporaryPassword: "130131" },
  { classNumber: 24, nickname: "GBG6C2N24", accountId: "GBG6C2N2486317", temporaryPassword: "859858" },
  { classNumber: 25, nickname: "GBG6C2N25", accountId: "GBG6C2N2550908", temporaryPassword: "945949" },
];

export const getGaebongClassAccounts = (grade: number, classroom: number) => {
  if (grade === 6 && classroom === 2) {
    return GAEBONG_G6_C2_ACCOUNTS;
  }

  return [];
};
