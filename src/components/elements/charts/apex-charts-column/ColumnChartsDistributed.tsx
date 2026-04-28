"use client"
import React, { useEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const ColumnChartsDistributed = () => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the options for the Apex chart
    const options: ApexOptions = {
        series: [{
            data: [21, 22, 10, 28, 16, 21, 13, 30]
        }],
        chart: {
            height: 350,
            type: 'bar',
            foreColor: '#7A7A7A',
            events: {
                click: function (chart, w, e) {
                }
            },
            toolbar: {
                show: true
            }
        },
        colors: ['#6C5FFC', '#1ABC9C', '#34B53A', '#0dcaf0', '#34B53A', '#9747FF', '#FF3A29', '#cff4fc'],
        plotOptions: {
            bar: {
                columnWidth: '45%',
                distributed: true,
            }
        },
        dataLabels: {
            enabled: false
        },
        fill: {
            opacity: [1, 1, 1, 0.6, 1, 1, 0.3, 0.7]
        },
        legend: {
            show: true,
            labels: {
                colors: '#7A7A7A'
            },
        },
        xaxis: {
            categories: [
                ['John', 'Doe'],
                ['Joe', 'Smith'],
                ['Jake', 'Williams'],
                'Amber',
                ['Peter', 'Brown'],
                ['Mary', 'Evans'],
                ['David', 'Wilson'],
                ['Lily', 'Roberts'],
            ],
            labels: {
                style: {
                    colors: '#6C5FFC',
                    fontSize: '12px'
                }
            }
        }
    };

    if (!isMounted) return <div>Loading...</div>;

    return <Chart options={options} series={options.series} type="bar" height={350} />;
};

export default ColumnChartsDistributed;
