import "server-only";

export type MinecraftEducationAccount = {
  name: string;
  id: string;
  password: string;
};

const normalizeName = (value: unknown) =>
  String(value || "")
    .replace(/\s/g, "")
    .trim();

const ACCOUNT_CONFIG = [
  {
    names: ["이민서", "송민서"],
    idEnv: "MINECRAFT_EDUCATION_MINSEO_ID",
  },
  {
    names: ["이민채", "송민채"],
    idEnv: "MINECRAFT_EDUCATION_MINCHAE_ID",
  },
] as const;

const getSharedPassword = () =>
  String(process.env.MINECRAFT_EDUCATION_SHARED_PASSWORD || "").trim();

export const getMinecraftEducationAccountForName = (
  nameInput: unknown
): MinecraftEducationAccount | null => {
  const name = normalizeName(nameInput);
  const config = ACCOUNT_CONFIG.find((item) =>
    item.names.some((alias) => normalizeName(alias) === name)
  );

  if (!config) return null;

  const id = String(process.env[config.idEnv] || "").trim();
  const password = getSharedPassword();
  if (!id || !password) return null;

  return { name, id, password };
};

export const hasMinecraftEducationAccountForName = (nameInput: unknown) =>
  Boolean(getMinecraftEducationAccountForName(nameInput));

export const getMinecraftEducationAccounts = () =>
  ACCOUNT_CONFIG.map((config) =>
    getMinecraftEducationAccountForName(config.names[0])
  ).filter((account): account is MinecraftEducationAccount => Boolean(account));
