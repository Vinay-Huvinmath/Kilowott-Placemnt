import axios from 'axios';
import { NextBestActionResult } from './next-best-action.js';

export interface CustomerForMessage {
  name: string;
  city?: string | null;
  lastProduct?: string;
}

export async function generateMessage(
  customer: CustomerForMessage,
  action: NextBestActionResult
): Promise<{ message: string; source: 'ai' | 'template'; subject: string }> {
  const firstName = customer.name.split(' ')[0] || 'Friend';
  const product = customer.lastProduct || 'handloom piece';
  const discountStr = action.discountPercent ? `${action.discountPercent}%` : 'courtesy';
  const discountCode = action.discountPercent ? `PULSE${action.discountPercent}` : 'PULSEVIP';

  // 1. Check if Gemini or Anthropic API key is provided
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (geminiKey) {
    try {
      const prompt = `Write a short 50 to 60 word personal message to a store customer named ${customer.name}.
Context: Small Goa shopkeeper selling handloom and home goods. Customer previously bought ${product}.
Goal: ${action.suggestedAction}. Discount: ${discountStr} off with code ${discountCode}.
Rules: Voice is warm, calm, specific, like an independent shopkeeper. Do not use corporate words. No exclamation marks. Sentences under 14 words. Return only the message text.`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }]
        },
        { timeout: 4000 }
      );

      const generated = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (generated && generated.trim().length > 10) {
        return {
          message: sanitizeMessage(generated.trim()),
          source: 'ai',
          subject: action.headline
        };
      }
    } catch {
      // Fallback silently
    }
  } else if (anthropicKey) {
    try {
      const prompt = `Write a short 50 to 60 word personal message to a store customer named ${customer.name}.
Context: Small Goa shopkeeper selling handloom and home goods. Customer previously bought ${product}.
Goal: ${action.suggestedAction}. Discount: ${discountStr} off with code ${discountCode}.
Rules: Voice is warm, calm, specific. No exclamation marks. Sentences under 14 words. Return only the message text.`;

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: 150,
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          timeout: 4000
        }
      );

      const generated = response.data?.content?.[0]?.text;
      if (generated && generated.trim().length > 10) {
        return {
          message: sanitizeMessage(generated.trim()),
          source: 'ai',
          subject: action.headline
        };
      }
    } catch {
      // Fallback silently
    }
  }

  // 2. Deterministic templates covering all 6 cases
  let message = '';
  switch (action.headline) {
    case 'Personal shopkeeper outreach':
      message = `Namaste ${firstName}. We set aside pieces from our new handloom run. Given your interest in our ${product}, I wanted you to see them first. Use code ${discountCode} for ${discountStr} off at checkout. Please write back if you need custom sizing.`;
      break;

    case 'VIP concierge appreciation':
      message = `Namaste ${firstName}. A quiet note to thank you for supporting our Goa studio. We packed a small batch of artisan pieces before the public launch. Let us know if you would like us to reserve anything for you.`;
      break;

    case 'Win-back revival note':
      message = `Namaste ${firstName}. It has been a while since your order for the ${product}. We have freshly harvested spices and woven textiles in stock. Take ${discountStr} off your next parcel with code ${discountCode}. We would be glad to pack for you again.`;
      break;

    case 'Loyalty milestone thank-you':
      message = `Namaste ${firstName}. Thank you for your continued visits to our shop. Your trust in our ${product} means a great deal to our weavers. Here is code ${discountCode} for ${discountStr} off whenever you next stop by.`;
      break;

    case 'Replenishment check-in':
      message = `Namaste ${firstName}. Checking in to see how your ${product} is holding up. We received fresh stock of handcrafted home essentials this week. Use code ${discountCode} for ${discountStr} off your re-order.`;
      break;

    case 'First-purchase care follow-up':
    default:
      message = `Namaste ${firstName}. We hope your ${product} reached you in good order. If you need any advice on care, reply to this note. For your second order, here is ${discountStr} off with code ${discountCode}.`;
      break;
  }

  return {
    message: sanitizeMessage(message),
    source: 'template',
    subject: action.headline
  };
}

function sanitizeMessage(text: string): string {
  // Strip banned exclamation marks and em dashes per copy rules
  return text
    .replace(/!/g, '.')
    .replace(/—/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}
