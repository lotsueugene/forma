'use client';

import { useRef, ReactNode } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

interface KineticMarqueeProps {
  children: ReactNode;
  baseVelocity?: number;
  className?: string;
}

export default function KineticMarquee({
  children,
  baseVelocity = 20,
  className = '',
}: KineticMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();

  const scrollVelocity = useTransform(
    scrollY,
    [0, 1000],
    [0, baseVelocity * 2]
  );

  const smoothVelocity = useSpring(scrollVelocity, {
    stiffness: 100,
    damping: 30,
    mass: 0.5,
  });

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden whitespace-nowrap ${className}`}
    >
      <motion.div
        className="inline-flex"
        animate={{
          x: ['0%', '-50%'],
        }}
        transition={{
          x: {
            duration: baseVelocity,
            repeat: Infinity,
            ease: 'linear',
          },
        }}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
}
