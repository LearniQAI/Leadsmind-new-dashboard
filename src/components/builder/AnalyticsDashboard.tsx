"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Users, Target, MousePointer2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const AnalyticsDashboard = ({ data }: { data: any[] }) => {
  // Mock data if none provided
  const chartData = data || [
    { name: 'Opt-in Page', value: 1200, conversion: '100%' },
    { name: 'Sales Page', value: 450, conversion: '37.5%' },
    { name: 'Checkout', value: 85, conversion: '18.8%' },
    { name: 'Thank You', value: 72, conversion: '84.7%' },
  ];

  const COLORS = ['#6c47ff', '#8b5cf6', '#a78bfa', '#c4b5fd'];

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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#888', fontSize: 12 }} 
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#888', fontSize: 12 }} 
                />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
