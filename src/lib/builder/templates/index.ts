import { educationLms } from './education-lms';
import { fitnessPower } from './fitness-power';
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
  educationLms,
  fitnessPower,
  // educationLms/fitnessPower are type:'funnel' and don't appear in the "Create website" modal
  // at all — so among the templates that actually render there (Blank Slate, then these four),
  // this order is what puts Velocity 4th on screen: Blank Slate(1), Mentor(2), Ascent(3),
  // Velocity(4), Archiste(5).
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
