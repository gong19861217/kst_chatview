import * as echarts from 'echarts/core';
import {
    ToolboxComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DataZoomComponent
  } from 'echarts/components';
  import { BarChart } from 'echarts/charts';
  import { CanvasRenderer } from 'echarts/renderers';
  
  echarts.use([
    ToolboxComponent,
    TooltipComponent,
    DataZoomComponent,
    GridComponent,
    LegendComponent,
    BarChart,
    CanvasRenderer
  ]);
import { memo, useCallback, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { secondToTime } from "../utils";
import useData from '../useData';

function getBaseObj() {
    const temp = {};
    for (let i = 0; i < 24; i++) {
        temp[i.toString().padStart(2, "0")] = 0;
    }
    return temp;
}

let count = 0;

function getRange(start, end, dict) {
    if(start === end) return;
    const dStart = dayjs(start);
    const dEnd = dayjs(end);
    const startDate = dStart.format("YYYY-MM-DD");
    const endDate = dEnd.format("YYYY-MM-DD");
    const startHour = dStart.hour();
    const endHour = dEnd.hour();
    const startSecond = dStart.minute() * 60 + dStart.second();
    const endSecond = dEnd.minute() * 60 + dEnd.second();
    dict[startDate] = dict[startDate] ?? getBaseObj();
    if (startDate === endDate) {
        for (let i = startHour; i <= endHour; i++) {
            count++;
            const hour = i.toString().padStart(2, "0");
            dict[startDate][hour] += 3600;
            if(i === startHour) {
                dict[startDate][hour] -= startSecond;
            }
            if(i === endHour) {
                dict[startDate][hour] -= (3600 - endSecond);
            }
        }
    }else{
        dict[endDate] = dict[endDate] ?? getBaseObj();
        for (let i = startHour; i <= 23; i++) {
            count++;
            const hour = i.toString().padStart(2, "0");
            dict[startDate][hour] += 3600;
            if(i === startHour) {
                dict[startDate][hour] -= startSecond;
            }
        }
        for (let i = 0; i <= endHour; i++) {
            count++;
            const hour = i.toString().padStart(2, "0");
            dict[endDate][hour] += 3600;
            if(i === endHour) {
                dict[startDate][hour] -= (3600 - endSecond);
            }
        }
    }
}

function processData(data) {
    count = 0;
    const dict = {};
    for (let i = 0; i < data.length; i++) {
        const { isin, ts } = data[i];
        if (!isin || (data[i + 1] && data[i + 1].isin)) continue;
        if(data[i + 1] === undefined && Date.now() - ts > 28800000) continue;
        const end = data[i + 1] === undefined ? Date.now() : data[i + 1].ts;
        getRange(ts, end, dict);
    }
    console.log("count", count);
    return dict;
}

const Single = () => {
    const datamap = useData((state) => state.data);
    const setLoading = useData((state) => state.setLoading);
    const chart = useRef(null);

    const chartElRef = useCallback((node) => {
        console.log("init chart")
        if (node !== null) {
            if(chart.current) {
                chart.current.dispose();
                chart.current = null;
            }
            chart.current = echarts.init(node);
        }
    }, []);

    useEffect(() => {
        if (!datamap) return;
        const name = Object.keys(datamap)[0];
        const data = datamap[name];
        chart.current.showLoading();
        var option;
        console.time("single");
        const dict = processData(data);
        console.timeEnd("single");

        let xAxisData = [];
        const rawData = [];
        const totalData = {};
        for (const [date, hourDict] of Object.entries(dict)) {
            xAxisData.push(date);
            totalData[date] = 0;
            for (let i = 0; i < 24; i++) {
                const key = i.toString().padStart(2, "0");
                if (rawData[i] === undefined) {
                    rawData[i] = [];
                }
                totalData[date] += hourDict[key];
                rawData[i].push((hourDict[key] / 60).toFixed(2));
            }
        }
        const grid = {
            left: 100,
            right: 100,
            top: 100,
            bottom: 100,
        };
        const series = new Array(24)
            .fill(1)
            .map((_, i) => i)
            .map((hour, sid) => {
                return {
                    name: hour + "点",
                    type: "bar",
                    stack: "total",
                    barWidth: "60%",
                    // emphasis: {
                    //     focus: "series",
                    // },
                    label: {
                        show: true,
                        formatter: (params) => {
                            return params.data == 0
                                ? ""
                                : `${hour}点[${params.data}分钟]`;
                        },
                    },
                    data: rawData[sid],
                    tooltip: {
                        formatter: (params) => {
                            const date = params.name;
                            const total = secondToTime(totalData[date]);
                            const hour = params.seriesName
                            const value = params.data
                            return `<p class="flex flex-col items-center text-center"><span class="font-bold mb-2">${date} <br/> 共在线${total}</span><span>${hour} 在线 ${value} 分钟</span><p>`;
                        }
                    }
                };
            });
        option = {
            tooltip: {},
            dataZoom: [
              {
                type: 'slider'
              },
              {
                type: 'inside'
              }
            ],
            legend: {
                selectedMode: true,
            },
            grid,
            yAxis: {
                type: "value",
            },
            xAxis: {
                type: "category",
                data: xAxisData,
                nameRotate: 90,
                axisLabel:{
                    interval: 0,
                    rotate: 0,
                    formatter: (value) => {
                        return `${value}\n[${secondToTime(totalData[value])}]`
                    }
                }
            },
            series,
        };
        option && chart.current.setOption(option);

        setLoading(false)
        chart.current.hideLoading();
    }, [datamap, setLoading]);

    return <div ref={chartElRef} className="w-full h-full"></div>;
};

export default memo(Single);
