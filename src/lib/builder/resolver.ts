import React from 'react';
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
import { Countdown } from '@/components/builder/user/Countdown';
import { PricingTable } from '@/components/builder/user/PricingTable';
import { FAQ } from '@/components/builder/user/FAQ';
import { UserButton } from '@/components/builder/user/Button';
import { ProgressBar } from '@/components/builder/user/ProgressBar';
import { UserTestimonial } from '@/components/builder/user/Testimonial';
import { StarRating } from '@/components/builder/user/StarRating';
import { LogoStrip } from '@/components/builder/user/LogoStrip';
import { Hero } from '@/components/builder/user/Hero';
import { Navbar } from '@/components/builder/user/Navbar';
import { Footer } from '@/components/builder/user/Footer';
import { BlogFeed } from '@/components/builder/user/BlogFeed';
import { CodeBlock } from '@/components/builder/user/CodeBlock';

export const wrapForReact19 = (Component: any) => {
  const Wrapped = React.forwardRef((props: any, ref: any) => {
    return React.createElement(Component, { ...props, dragRef: ref });
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
  Container: wrapForReact19(Container),
  Section: wrapForReact19(Section),
  Columns: wrapForReact19(Columns),
  Spacer: wrapForReact19(Spacer),
  Divider: wrapForReact19(Divider),
  Heading: wrapForReact19(Heading),
  Paragraph: wrapForReact19(Paragraph),
  Image: wrapForReact19(ImageComponent),
  Video: wrapForReact19(Video),
  Icon: wrapForReact19(Icon),
  Text: wrapForReact19(Text),
  Form: wrapForReact19(Form),
  Countdown: wrapForReact19(Countdown),
  PricingTable: wrapForReact19(PricingTable),
  FAQ: wrapForReact19(FAQ),
  Button: wrapForReact19(UserButton),
  UserButton: wrapForReact19(UserButton),
  ProgressBar: wrapForReact19(ProgressBar),
  Testimonial: wrapForReact19(UserTestimonial),
  UserTestimonial: wrapForReact19(UserTestimonial),
  StarRating: wrapForReact19(StarRating),
  LogoStrip: wrapForReact19(LogoStrip),
  Hero: wrapForReact19(Hero),
  Navbar: wrapForReact19(Navbar),
  Footer: wrapForReact19(Footer),
  BlogFeed: wrapForReact19(BlogFeed),
  CodeBlock: wrapForReact19(CodeBlock),
};
