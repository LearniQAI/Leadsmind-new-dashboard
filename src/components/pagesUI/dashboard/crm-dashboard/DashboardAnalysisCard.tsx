"use client";
import React from 'react';

const DashboardAnalysisCard = () => {
  const stats = [
    {
      label: 'Total Revenue',
      value: '$84.00K',
      trend: '+17.5%',
      trendType: 'up',
      subLabel: 'Than last month',
      icon: 'fa-dollar-sign',
      color: 'var(--amber)',
      bgColor: 'rgba(245, 158, 11, 0.1)'
    },
    {
      label: 'New Deals',
      value: '1,240',
      trend: '+12.3%',
      trendType: 'up',
      subLabel: 'Active this week',
      icon: 'fa-filter',
      color: 'var(--accent2)',
      bgColor: 'rgba(59, 130, 246, 0.1)'
    },
    {
      label: 'Active Clients',
      value: '842',
      trend: '+5.4%',
      trendType: 'up',
      subLabel: 'Directly managed',
      icon: 'fa-user-tie',
      color: 'var(--cyan)',
      bgColor: 'rgba(6, 182, 212, 0.1)'
    },
    {
      label: 'Avg. Profit',
      value: '32.5%',
      trend: '+2.1%',
      trendType: 'up',
      subLabel: 'Gross margin',
      icon: 'fa-chart-line',
      color: 'var(--green)',
      bgColor: 'rgba(16, 185, 129, 0.1)'
    },
    {
      label: 'Conversion',
      value: '18.2%',
      trend: '+4.8%',
      trendType: 'up',
      subLabel: 'Leads to deals',
      icon: 'fa-bullseye',
      color: 'var(--purple)',
      bgColor: 'rgba(139, 92, 246, 0.1)'
    },
    {
      label: 'Open Tasks',
      value: '42',
      trend: '6 High',
      trendType: 'up',
      subLabel: 'Due this week',
      icon: 'fa-list-check',
      color: 'var(--red)',
      bgColor: 'rgba(244, 63, 94, 0.1)'
    },
    {
      label: 'Lead Score',
      value: '78',
      trend: 'Stable',
      trendType: 'up',
      subLabel: 'Average quality',
      icon: 'fa-star',
      color: 'var(--indigo)',
      bgColor: 'rgba(99, 102, 241, 0.1)'
    },
    {
      label: 'Social Reach',
      value: '124K',
      trend: '+24%',
      trendType: 'up',
      subLabel: 'Total impressions',
      icon: 'fa-hashtag',
      color: 'var(--pink)',
      bgColor: 'rgba(236, 72, 153, 0.1)'
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5 w-full">
      {stats.map((stat, index) => (
        <div key={index} className="stat-card" style={{ '--card-accent': stat.color } as React.CSSProperties}>
          <div className="flex justify-between items-start mb-4">
            <div className="stat-icon" style={{ backgroundColor: stat.bgColor, color: stat.color }}>
              <i className={`fa-solid ${stat.icon}`}></i>
            </div>
            <div className={`stat-trend ${stat.trendType}`}>
              <i className={`fa-solid fa-arrow-${stat.trendType === 'up' ? 'up' : 'down'} mr-1`}></i>
              {stat.trend}
            </div>
          </div>
          <div className="stat-value font-space">{stat.value}</div>
          <div className="stat-label">{stat.label}</div>
          <div className="stat-sublabel">{stat.subLabel}</div>

          <div className="stat-sparkline mt-4">
            <div className="sparkline-bar" style={{ height: '40%', backgroundColor: stat.color, opacity: 0.3 }}></div>
            <div className="sparkline-bar" style={{ height: '60%', backgroundColor: stat.color, opacity: 0.5 }}></div>
            <div className="sparkline-bar" style={{ height: '45%', backgroundColor: stat.color, opacity: 0.3 }}></div>
            <div className="sparkline-bar" style={{ height: '70%', backgroundColor: stat.color, opacity: 0.8 }}></div>
            <div className="sparkline-bar" style={{ height: '55%', backgroundColor: stat.color, opacity: 0.4 }}></div>
            <div className="sparkline-bar" style={{ height: '85%', backgroundColor: stat.color, opacity: 1 }}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardAnalysisCard;