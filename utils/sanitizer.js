import validator from 'validator';

export const sanitizeUser = (user) => {
  return {
    ...user,
    email: validator.normalizeEmail(user.email),
    firstName: validator.escape(user.firstName || ''),
    lastName: validator.escape(user.lastName || '')
  };
};