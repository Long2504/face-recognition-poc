type Environment = Record<string, unknown>;

export function validateEnvironment(config: Environment): Environment {
  const required = ['API_KEY', 'JWT_SECRET', 'WEB_ORIGIN'] as const;
  for (const key of required) {
    const value = config[key];
    if (typeof value !== 'string' || value.length < 8) {
      throw new Error(`${key} is required and must contain at least 8 characters`);
    }
  }

  const port = Number(config.API_PORT ?? 3000);
  const maxExpires = Number(config.JWT_MAX_EXPIRES_SECONDS ?? 86400);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('API_PORT is invalid');
  if (!Number.isInteger(maxExpires) || maxExpires < 60) throw new Error('JWT_MAX_EXPIRES_SECONDS is invalid');

  return { ...config, API_PORT: port, JWT_MAX_EXPIRES_SECONDS: maxExpires };
}
