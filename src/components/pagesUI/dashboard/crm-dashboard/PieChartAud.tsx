"use client";

import React, { useLayoutEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

// Dynamically import the Chart component
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const PieChartAudience = () => {
    const [isMounted, setIsMounted] = useState(false);

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    // Define options for the Apex chart
    const options: ApexOptions = {
        series: [25, 75],
        labels: ["Subscriber", "New User"],
        chart: {
            type: "donut",
            width: "100%",
            height: 212,
        },
        colors: ["#1ABC9C", "#6C5FFC"],
        legend: {
            show: false, 
            position: "bottom", 
        },
        plotOptions: {
            pie: {
                donut: {
                    labels: {
                        show: true,
                        name: {
                            show: true,
                            fontSize: "18px",
                            color: "#34B53A",
                            offsetY: 5,
                        },
                        value: {
                            show: false,
                            fontSize: "16px",
                            color: "#34B53A",
                            offsetY: 16,
                            formatter: function (val) {
                                return val;
                            },
                        },
                        total: {
                            show: true,
                            label: "Overview",
                            color: "#34B53A",
                            fontSize: "20px",
                            formatter: function (w) {
                                return w.globals.seriesTotals.reduce((a:number, b:number) => a + b, 0);
                            },
                        },
                    },
                },
            },
        },
        tooltip: {
            enabled: true,
            y: {
                formatter: function (val) {
                    return val + "%";
                },
            },
        },
        dataLabels: {
            enabled: false,
            style: {
                colors: ["#34B53A"], 
            },
        },
        stroke: {
            width: 0,
        },
    };

    return isMounted ? (
        <Chart options={options} series={options.series} type="donut" height={212} />
    ) : (
        <div>Loading...</div>
    );
};

export default PieChartAudience;
