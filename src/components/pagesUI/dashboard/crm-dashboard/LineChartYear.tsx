
"use client";

import React, { useLayoutEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

// Dynamically import the Chart component
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const LineChartYear = () => {
    const [isMounted, setIsMounted] = useState(false);

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define options for the Apex chart
    const options: ApexOptions = {
        series: [{
            name: 'sale',
            data: [50, 40, 38, 61, 82, 109, 100]
        }, {
            name: 'series2',
            data: [40, 50, 65, 32, 70, 90, 80]
        }],
        chart: {
            height: 283,
            offsetX: 0,
            type: 'area',
            // offsetY: 2,
            toolbar: {
                show: false,
            },
            zoom: {
                enabled: false
            },
        },
        colors: ['#6C5FFC', '#05C3FB'],
        fill: {
            opacity: 1
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth'
        },
        grid: {
            show: true,
            borderColor: '#E6E6E6',
        },
        xaxis: {
            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul',],
            labels: {
                style: {
                    colors: '#7A7A7A',
                    fontSize: '12px',
                    fontFamily: "'Roboto', sans-serif",
                    fontWeight: 400,
                    cssClass: 'apexcharts-xaxis-label',
                },
            },
        },
        yaxis: {

            show: true,
            labels: {
                offsetX: -10,
                formatter: function (value) {
                    return value + "k";
                },
                style: {
                    colors: '#7A7A7A',
                    fontSize: '12px',
                    fontFamily: "'Roboto', sans-serif",
                    fontWeight: 400,
                    cssClass: 'apexcharts-xaxis-label',
                },
            },
        },
        legend: {
            show: false,
        },
    };

    return isMounted ? (
        <Chart options={options} series={options.series} type="area" height={283} />
    ) : (
        <div>Loading...</div>
    );
};

export default LineChartYear;
