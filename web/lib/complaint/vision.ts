// Reads a UPI payment screenshot into fields. The image stays in memory for this request only.
import { generateObject, type LanguageModel } from 'ai';
import { z } from 'zod';
import { normalizeShot, type Shot } from './screenshot';

const schema = z.object({
  is_payment_screen: z.boolean().describe('true only if this is a UPI or bank payment confirmation or history screen'),
  utr: z.string().nullable().describe('the 12-digit UTR / UPI reference / transaction ID exactly as printed, or null'),
  amount: z.string().nullable().describe('amount paid, as printed, or null'),
  payee: z.string().nullable().describe('who was paid: UPI ID (name@handle) if shown, else the phone number, else the name'),
  when: z.string().nullable().describe('date and time as printed, or null'),
});

export async function readScreenshot(
  image: Uint8Array,
  mediaType: string,
  model: LanguageModel,
  generate: typeof generateObject = generateObject,
): Promise<{ ok: true; shot: Shot } | { ok: false; problem: string }> {
  const { object } = await generate({
    model,
    schema,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', image, mediaType },
          {
            type: 'text',
            text: 'Read this payment screenshot. Copy numbers exactly as printed; never guess a digit. If a field is not visible, use null.',
          },
        ],
      },
    ],
  });
  if (!object.is_payment_screen) return { ok: false, problem: 'this does not look like a payment screen' };
  return { ok: true, shot: normalizeShot(object) };
}
