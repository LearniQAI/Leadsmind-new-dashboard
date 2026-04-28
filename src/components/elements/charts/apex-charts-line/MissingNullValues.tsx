"use client";
import React, { useLayoutEffect, useState } from "react";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const MissingNullValues = () => {
    const [isMounted, setIsMounted] = useState(false);

    useLayoutEffect(() => {
        setIsMounted(true);
    }, []);

    const sanitizedSeries = [
        {
            name: "Peter",
            data: [5, 5, 10, 8, 7, 5, 4, null, null, null, 10, 10, 7, 8, 6, 9],
        },
        {
            name: "Johnny",
            data: [10, 15, null, 12, null, 10, 12, 15, null, null, 12, null, 14, null, null, null],
        },
        {
            name: "David",
            data: [null, null, null, null, 3, 4, 1, 3, 4, 6, 7, 9, 5, null, null, null],
        },
    ];

    const options = {
        chart: {
            height: 350,
            type: "line" as "line",
            foreColor: "#7A7A7A",
            zoom: { enabled: false },
            animations: { enabled: false },
            toolbar: { show: false },
        },
        colors: ["#6C5FFC", "#1ABC9C", "#34B53A"],
        stroke: {
            width: [5, 5, 4],
            curve: "straight" as "straight",
        },
        xaxis: {
            categories: Array.from({ length: 16 }, (_, i) => (i + 1).toString()),
            labels: {
                style: {
                    colors: "#7A7A7A",
                    fontSize: "12px",
                    fontFamily: "'Roboto', sans-serif",
                    fontWeight: 400,
                },
            },
        },
    };

    if (!isMounted) return <div>Loading...</div>;

    return <Chart options={options} series={sanitizedSeries} type="line" height={350} />;
};

export default MissingNullValues;
