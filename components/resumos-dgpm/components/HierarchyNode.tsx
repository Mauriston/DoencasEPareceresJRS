import React from 'react';
import Icon from './Icon';

interface HierarchyNodeProps {
  title: string;
  description: string;
  icon: string;
  isTop?: boolean;
  isBottom?: boolean;
}

const HierarchyNode: React.FC<HierarchyNodeProps> = ({ title, description, icon, isTop = false, isBottom = false }) => {
  return (
    <div className="flex flex-col items-center w-full my-2">
      <div className="bg-white border-2 border-[#B8860B]/70 rounded-lg p-3 w-full max-w-sm text-center shadow-sm z-10 hover:border-[#B8860B] transition-colors">
        <div className="flex items-center justify-center space-x-2 mb-1">
          <Icon name={icon} className="text-[#B8860B] text-xl" />
          <h3 className="font-heading text-md font-bold text-navy">{title}</h3>
        </div>
        <p className="text-gray-500 text-xs">{description}</p>
      </div>
      {!isBottom && (
          <div className="w-[3px] bg-gray-200 h-8" />
      )}
    </div>
  );
};

export default HierarchyNode;