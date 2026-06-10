import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

interface SectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, icon, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1,
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`my-8 bg-white border border-gray-100 rounded-xl p-5 shadow-sm transition-all duration-700 ease-in-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="flex items-center mb-4 border-b border-gray-100 pb-3">
        <Icon name={icon} className="text-[#B8860B] text-2xl mr-3" />
        <h2 className="font-heading text-lg font-bold text-navy uppercase tracking-wider">
          {title}
        </h2>
      </div>
      <div className="text-gray-600 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
};

export default Section;