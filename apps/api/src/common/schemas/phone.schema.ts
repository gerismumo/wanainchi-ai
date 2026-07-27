import { z } from 'zod';

const normalizeKenyanPhone = (value: unknown) => {
  if (typeof value !== 'string') return value;

  let phone = value.replace(/\D/g, '');

  if (phone.startsWith('0')) {
    phone = '254' + phone.slice(1);
  } else if (phone.startsWith('7') || phone.startsWith('1')) {
    phone = '254' + phone;
  }

  return phone;
};

export const kenyanPhoneSchema = z.preprocess(
  normalizeKenyanPhone,
  z
    .string()
    .regex(
      /^254(?:7\d{8}|1\d{8})$/,
      'Phone number must be a valid Kenyan number in the format 2547XXXXXXXX or 2541XXXXXXXX',
    ),
);
