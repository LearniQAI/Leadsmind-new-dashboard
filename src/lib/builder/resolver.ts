import React from 'react';
import { SELF_SPACED_BLOCKS, omitSpacingProps } from '@/lib/builder/spacing';
import { Container } from '@/components/builder/user/Container';
import { Section } from '@/components/builder/user/Section';
import { Columns } from '@/components/builder/user/Columns';
import { Spacer } from '@/components/builder/user/Spacer';
import { Divider } from '@/components/builder/user/Divider';
import { Heading } from '@/components/builder/user/Heading';
import { Paragraph } from '@/components/builder/user/Paragraph';
import { Image as ImageComponent } from '@/components/builder/user/Image';
import { Video } from '@/components/builder/user/Video';
import { Icon } from '@/components/builder/user/Icon';
import { Text } from '@/components/builder/user/Text';
import { Form } from '@/components/builder/user/Form';
import { OrderForm } from '@/components/builder/user/OrderForm';
import { Upsell } from '@/components/builder/user/Upsell';
import { Downsell } from '@/components/builder/user/Downsell';
import { ThankYou } from '@/components/builder/user/ThankYou';
import { PopupForm } from '@/components/builder/user/PopupForm';
import { WebinarRegistration } from '@/components/builder/user/WebinarRegistration';
import { WebinarThankYou } from '@/components/builder/user/WebinarThankYou';
import { Countdown } from '@/components/builder/user/Countdown';
import { PricingTable } from '@/components/builder/user/PricingTable';
import { FAQ } from '@/components/builder/user/FAQ';
import { UserButton } from '@/components/builder/user/Button';
import { ProgressBar } from '@/components/builder/user/ProgressBar';
import { UserTestimonial } from '@/components/builder/user/Testimonial';
import { StarRating } from '@/components/builder/user/StarRating';
import { LogoStrip } from '@/components/builder/user/LogoStrip';
import { StatCounter } from '@/components/builder/user/StatCounter';
import { Hero } from '@/components/builder/user/Hero';
import { Navbar } from '@/components/builder/user/Navbar';
import { Footer } from '@/components/builder/user/Footer';
import { BlogFeed } from '@/components/builder/user/BlogFeed';
import { CodeBlock } from '@/components/builder/user/CodeBlock';
import { LessonBlockNode } from '@/components/builder/user/LessonBlockNode';
import { ContentBox } from '@/components/builder/user/ContentBox';

// `resolverName` decides who applies the universal top/bottom spacing (lib/builder/spacing.ts):
// SELF_SPACED_BLOCKS paint it on their own box and receive the props; every other block has
// it applied by its node wrapper (NodeSpacingBox) and never sees the keys, so they can neither
// double-apply nor leak onto the DOM through a component's `{...props}` spread.
export const wrapForReact19 = (Component: any, resolverName: string) => {
 const ownsSpacing = SELF_SPACED_BLOCKS.has(resolverName);
 const Wrapped = React.forwardRef((props: any, ref: any) => {
  return React.createElement(Component, { ...(ownsSpacing ? props : omitSpacingProps(props)), dragRef: ref });
 });
 
 if (Component.craft) {
  (Wrapped as any).craft = Component.craft;
 }
 
 const name = Component.displayName || Component.name || 'Component';
 Wrapped.displayName = name;
 
 try {
  Object.defineProperty(Wrapped, 'name', { value: name });
 } catch (e) {}

 return Wrapped;
};

export const RESOLVER = {
 Container: wrapForReact19(Container, 'Container'),
 Section: wrapForReact19(Section, 'Section'),
 Columns: wrapForReact19(Columns, 'Columns'),
 Spacer: wrapForReact19(Spacer, 'Spacer'),
 Divider: wrapForReact19(Divider, 'Divider'),
 Heading: wrapForReact19(Heading, 'Heading'),
 Paragraph: wrapForReact19(Paragraph, 'Paragraph'),
 Image: wrapForReact19(ImageComponent, 'Image'),
 UserImage: wrapForReact19(ImageComponent, 'UserImage'),
 Video: wrapForReact19(Video, 'Video'),
 Icon: wrapForReact19(Icon, 'Icon'),
 Text: wrapForReact19(Text, 'Text'),
 Form: wrapForReact19(Form, 'Form'),
 OrderForm: wrapForReact19(OrderForm, 'OrderForm'),
 Upsell: wrapForReact19(Upsell, 'Upsell'),
 Downsell: wrapForReact19(Downsell, 'Downsell'),
 ThankYou: wrapForReact19(ThankYou, 'ThankYou'),
 PopupForm: wrapForReact19(PopupForm, 'PopupForm'),
 WebinarRegistration: wrapForReact19(WebinarRegistration, 'WebinarRegistration'),
 WebinarThankYou: wrapForReact19(WebinarThankYou, 'WebinarThankYou'),
 Countdown: wrapForReact19(Countdown, 'Countdown'),
 PricingTable: wrapForReact19(PricingTable, 'PricingTable'),
 FAQ: wrapForReact19(FAQ, 'FAQ'),
 Button: wrapForReact19(UserButton, 'Button'),
 UserButton: wrapForReact19(UserButton, 'UserButton'),
 ProgressBar: wrapForReact19(ProgressBar, 'ProgressBar'),
 Testimonial: wrapForReact19(UserTestimonial, 'Testimonial'),
 UserTestimonial: wrapForReact19(UserTestimonial, 'UserTestimonial'),
 StarRating: wrapForReact19(StarRating, 'StarRating'),
 LogoStrip: wrapForReact19(LogoStrip, 'LogoStrip'),
 StatCounter: wrapForReact19(StatCounter, 'StatCounter'),
 Hero: wrapForReact19(Hero, 'Hero'),
 Navbar: wrapForReact19(Navbar, 'Navbar'),
 Footer: wrapForReact19(Footer, 'Footer'),
 BlogFeed: wrapForReact19(BlogFeed, 'BlogFeed'),
 CodeBlock: wrapForReact19(CodeBlock, 'CodeBlock'),
 LessonBlockNode: wrapForReact19(LessonBlockNode, 'LessonBlockNode'),
 ContentBox: wrapForReact19(ContentBox, 'ContentBox'),
};
