import React from 'react';
import Icon from './Icon';

interface InfoCardProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, icon, children }) => {
  return (
    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg shadow-sm w-full">
      <div className="flex items-center mb-2">
        <Icon name={icon} className="text-[#B8860B] text-xl" />
        <h3 className="font-heading text-md font-bold text-navy ml-2">{title}</h3>
      </div>
      <div className="text-gray-600 text-xs">{children}</div>
    </div>
  );
};

export default InfoCard;