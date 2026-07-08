"use client";

import React, { useState, useEffect } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
import { TrendingUp, Users, Target, MousePointer2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export const AnalyticsDashboard = ({ data }: { data: any[] }) => {
 const [isMounted, setIsMounted] = useState(false);

 useEffect(() => {
  setIsMounted(true);
 }, []);

 // Mock data if none provided
 const chartData = data || [
  { name: 'Opt-in Page', value: 1200, conversion: '100%' },
  { name: 'Sales Page', value: 450, conversion: '37.5%' },
  { name: 'Checkout', value: 85, conversion: '18.8%' },
  { name: 'Thank You', value: 72, conversion: '84.7%' },
 ];

 const COLORS = ['#6c47ff', '#8b5cf6', '#a78bfa', '#c4b5fd'];

 const chartOptions: ApexOptions = {
  chart: {
   type: 'bar',
   toolbar: { show: false },
   foreColor: '#888',
  },
  plotOptions: {
   bar: {
    distributed: true,
    borderRadius: 8,
    borderRadiusApplication: 'end',
    columnWidth: '55%',
   },
  },
  colors: chartData.map((_, i) => COLORS[i % COLORS.length]),
  dataLabels: { enabled: false },
  legend: { show: false },
  grid: {
   borderColor: '#ffffff10',
   strokeDashArray: 3,
   xaxis: { lines: { show: false } },
   yaxis: { lines: { show: true } },
  },
  xaxis: {
   categories: chartData.map((d) => d.name),
   axisBorder: { show: false },
   axisTicks: { show: false },
   labels: { style: { colors: '#888', fontSize: '12px' } },
  },
  yaxis: {
   labels: { style: { colors: '#888', fontSize: '12px' } },
  },
  tooltip: {
   theme: 'dark',
   style: { fontSize: '12px' },
  },
 };

 const chartSeries = [{ name: 'Value', data: chartData.map((d) => d.value) }];

 return (
  <div className="space-y-6 p-8">
   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    {[
     { label: 'Total Visitors', value: '1,842', icon: Users, color: 'text-blue-500' },
     { label: 'Avg. Conversion', value: '12.4%', icon: Target, color: 'text-emerald-500' },
     { label: 'Total Leads', value: '228', icon: MousePointer2, color: 'text-primary' },
     { label: 'Revenue (Attributed)', value: '$12,450', icon: TrendingUp, color: 'text-amber-500' },
    ].map((stat, i) => (
      <Card key={i} className="border-white/5 bg-white/[0.02]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-black mt-1">{stat.value}</p>
            </div>
            <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
   </div>

   <Card className="border-white/5 bg-white/[0.02]">
    <CardHeader>
     <CardTitle className="text-lg font-bold">Funnel Conversion Flow</CardTitle>
    </CardHeader>
    <CardContent>
     <div className="h-[300px] w-full mt-4">
      {isMounted ? (
       <Chart options={chartOptions} series={chartSeries} type="bar" height="100%" width="100%" />
      ) : (
       <div className="h-full w-full" />
      )}
     </div>
    </CardContent>
   </Card>
  </div>
 );
};
