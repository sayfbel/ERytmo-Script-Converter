'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface BlurFadeProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  yOffset?: number;
  blur?: string;
  className?: string;
  viewportMargin?: string;
}

export default function BlurFade({
  children,
  delay = 0,
  duration = 0.85,
  yOffset = 24,
  blur = '12px',
  className = '',
  viewportMargin = '-40px',
  ...props
}: BlurFadeProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: yOffset,
        filter: `blur(${blur})`,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
      }}
      viewport={{ once: true, margin: viewportMargin }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1], // Smooth cinematic curve
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
