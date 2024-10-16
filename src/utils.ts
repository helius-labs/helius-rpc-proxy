import jwt from '@tsndr/cloudflare-worker-jwt';

export const isValidJWT = async (
  request: Request,
  env: Env,
): Promise<Boolean> => {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return false;
  }
  const secret = env.JWT_SECRET;
  const isValid = await jwt.verify(token, secret, 'HS512');
  if (!isValid) {
    return false;
  }
  return true;
};
