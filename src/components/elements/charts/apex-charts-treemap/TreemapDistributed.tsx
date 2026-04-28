"use client";
import React, { useEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const TreemapDistributed = () => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Define options for the Apex chart
    const options: ApexOptions = {
        series: [
            {
                data: [
                    { x: 'New Delhi', y: 218 },
                    { x: 'Kolkata', y: 149 },
                    { x: 'Mumbai', y: 184 },
                    { x: 'Ahmedabad', y: 55 },
                    { x: 'Bangaluru', y: 84 },
                    { x: 'Pune', y: 31 },
                    { x: 'Chennai', y: 70 },
                    { x: 'Jaipur', y: 30 },
                    { x: 'Surat', y: 44 },
                    { x: 'Hyderabad', y: 68 },
                    { x: 'Lucknow', y: 28 },
                    { x: 'Indore', y: 19 },
                    { x: 'Kanpur', y: 29 }
                ]
            }
        ],
        legend: {
            show: true,
            labels: {
                colors: '#7A7A7A'
            },
        },
        chart: {
            height: 350,
            type: 'treemap',
            toolbar: {
                show: true
            }
        },
        colors: [
            '#3B93A5', '#F7B844', '#ADD8C7', '#EC3C65', '#CDD7B6',
            '#C1F666', '#D43F97', '#1E5D8C', '#421243', '#7F94B0',
            '#EF6537', '#C0ADDB'
        ],
        fill: { opacity: 0.8 },
        plotOptions: {
            treemap: {
                distributed: true,
                enableShades: false
            }
        }
    };

    return isMounted ? (
        <Chart options={options} series={options.series} type="treemap" height={350} />
    ) : (
        <div>Loading...</div>
    );
};

export default TreemapDistributed;
