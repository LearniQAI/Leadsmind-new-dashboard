import { velocity } from './velocity';
import { mentor } from './mentor';
import { ascent } from './ascent';
import { archiste } from './archiste';
import { orderFormBasic } from './order-form-basic';
import { upsellBasic } from './upsell-basic';
import { downsellBasic } from './downsell-basic';
import { thankYouBasic } from './thank-you-basic';
import { infoContactBasic } from './info-contact-basic';
import { inlineFormBasic } from './inline-form-basic';
import { webinarRegistrationBasic } from './webinar-registration-basic';
import { webinarThankYouBasic } from './webinar-thank-you-basic';
import { BuilderTemplate } from '../templates';

export const ALL_TEMPLATES: BuilderTemplate[] = [
  // Order among templates shown in the "Create website" modal: Blank Slate(1), Mentor(2),
  // Ascent(3), Velocity(4), Archiste(5).
  mentor,
  ascent,
  velocity,
  archiste,
  orderFormBasic,
  upsellBasic,
  downsellBasic,
  thankYouBasic,
  infoContactBasic,
  inlineFormBasic,
  webinarRegistrationBasic,
  webinarThankYouBasic
];
