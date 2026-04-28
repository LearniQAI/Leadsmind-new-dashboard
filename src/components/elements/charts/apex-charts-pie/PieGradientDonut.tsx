"use client"
import React, { useLayoutEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const PieGradientDonut = () => {
    const [isMounted, setIsMounted] = useState(false);
    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define the options for the Apex chart
    const options:ApexOptions = {
        series: [44, 55, 41, 17, 15],
        chart: {
            width: 405,
            type: 'donut',
            foreColor: '#7A7A7A',
        },
        plotOptions: {
            pie: {
                startAngle: -90,
                endAngle: 270
            }
        },
        dataLabels: {
            enabled: false
        },
        fill: {
            type: 'gradient',
        },
        legend: {
            formatter: function (val, opts) {
                return val + " - " + opts.w.globals.series[opts.seriesIndex]
            },
            labels: {
                colors: '#7A7A7A',
            },
        },
        responsive: [{
            breakpoint: 480,
            options: {
                chart: {
                    width: 200
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        colors: '#7A7A7A',
                        fontSize: '12px',
                        fontFamily: "'Roboto', sans-serif",
                    },
                }
            }
        }],
    };

    return isMounted ? (
        <Chart options={options} series={options.series} type="donut" height={250} width={405} />
    ) : (
        <div>Loading...</div>
    );
};

export default PieGradientDonut;
