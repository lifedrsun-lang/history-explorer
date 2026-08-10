import "server-only";

import { createClient } from "@supabase/supabase-js";

class SupabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigurationError";
  }
}

const getRequiredEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new SupabaseConfigurationError(
      `Missing Supabase environment variable: ${name}`
    );
  }

  return value;
};

export const isSupabaseConfigurationError = (error: unknown) => {
  return error instanceof SupabaseConfigurationError;
};

export const getSupabaseServer = () => {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const getAssignmentBucketName = () => {
  return getRequiredEnv("SUPABASE_ASSIGNMENT_BUCKET");
};
