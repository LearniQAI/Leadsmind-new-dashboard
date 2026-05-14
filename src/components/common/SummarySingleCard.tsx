import React from "react";

interface CardProps {
 iconClass: string; 
 title: string; 
 value: string | number; 
 description?: string; 
 percentageChange?: string; 
 isIncrease?: boolean; 
 color?: string;
}

const SummarySingleCard: React.FC<CardProps> = ({
 iconClass,
 title,
 value,
 description,
 percentageChange,
 isIncrease = true,
 color = 'var(--accent2)'
}) => {
 return (
  <div className="stat-card" style={{ '--card-accent': color } as React.CSSProperties}>
   <div className="flex justify-between items-start mb-4">
    <div className="stat-icon" style={{ backgroundColor: `${color}15`, color: color }}>
     <i className={`fa-solid ${iconClass}`}></i>
    </div>
    {percentageChange && (
     <div className={`stat-trend ${isIncrease ? 'up' : 'down'}`}>
      <i className={`fa-solid fa-arrow-${isIncrease ? 'up' : 'down'} mr-1`}></i>
      {percentageChange}
     </div>
    )}
   </div>
   <div className="stat-value font-space">{value}</div>
   <div className="stat-label">{title}</div>
   {description && <div className="stat-sublabel">{description}</div>}
  </div>
 );
};

export default SummarySingleCard;
