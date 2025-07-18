import jwt from '@tsndr/cloudflare-worker-jwt';

export const ElixirEnvironment = {
  LIVE_PROD: 'live-prod',
  LIVE_INT: 'live-int',
  LIVE_DEV: 'live-dev',
  TEST_PROD: 'test-prod',
  TEST_INT: 'test-int',
  TEST_DEV: 'test-dev',
} as const;

export const isValidJWT = async (
  request: Request,
  env: Env,
  elixirEnv: (typeof ElixirEnvironment)[keyof typeof ElixirEnvironment],
): Promise<Boolean> => {
  const [type, token] = request.headers.get('authorization')?.split(' ') ?? [];
  if (type !== 'Bearer' || !token) {
    return false;
  }

  const JWT_PUBKEY = getJWTPubKey(elixirEnv, env);

  if (!JWT_PUBKEY) {
    console.error(`JWT public key not found for environment: ${elixirEnv}`);
    return false;
  }

  const isValid = await jwt.verify(token, JWT_PUBKEY, 'RS384');

  if (!isValid) {
    return false;
  }

  return true;
};

const getJWTPubKey = (
  elixirEnv: (typeof ElixirEnvironment)[keyof typeof ElixirEnvironment],
  env: Env,
): string | undefined => {
  // Define environment to public key mappings
  const prodEnvKeys = {
    [ElixirEnvironment.LIVE_PROD]: env.LIVE_PROD_JWT_PUBKEY,
  } as const;

  const nonProdEnvKeys = {
    [ElixirEnvironment.LIVE_DEV]: env.LIVE_DEV_JWT_PUBKEY,
    [ElixirEnvironment.LIVE_INT]: env.LIVE_INT_JWT_PUBKEY,
    [ElixirEnvironment.TEST_INT]: env.SANDBOX_INT_JWT_PUBKEY,
    [ElixirEnvironment.TEST_DEV]: env.SANDBOX_DEV_JWT_PUBKEY,
    [ElixirEnvironment.TEST_PROD]: env.SANDBOX_PROD_JWT_PUBKEY,
  } as const;

  if (env.IS_LIVE_PROD) {
    return prodEnvKeys[elixirEnv as keyof typeof prodEnvKeys];
  }

  return nonProdEnvKeys[elixirEnv as keyof typeof nonProdEnvKeys];
};
